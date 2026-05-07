import { mkdir } from "node:fs/promises";
import { ProductCrawlerService } from "./productCrawlerService";
import { prisma } from "./prismaClient";

/**
 * Delay between each batch to avoid hammering remote servers.
 * Override via --delay-ms=<ms> CLI flag.
 */
const DEFAULT_DELAY_MS = 5_000;
const FAILED_LOG_FILE = "logs/failed-company-products.txt";

type CliOptions = {
  delayMs: number;
  force: boolean;
  batch: number;
  retryFailed: boolean;
  pool: number;
};

type AggregateResult = {
  crawled: number;
  skipped: number;
  failed: number;
  totalSaved: number;
  failedIds: number[];
};

async function main() {
  const options = parseCliOptions(Bun.argv.slice(2));
  const service = new ProductCrawlerService(prisma);

  await mkdir("logs", { recursive: true });

  const allCompanies = await prisma.exhibitor.findMany({
    select: {
      companyId: true,
    },
    distinct: ["companyId"],
    orderBy: {
      companyId: "asc",
    },
  });

  const allCompanyIds = allCompanies.map((e) => e.companyId);

  let companyIdsToCrawl: number[];

  // 1. Determine already-crawled exclusion
  if (options.force) {
    companyIdsToCrawl = allCompanyIds;
    console.log(`Force mode: processing all ${allCompanyIds.length} companies.`);
  } else {
    const crawledCompanies = await prisma.product.groupBy({
      by: ["companyId"],
      where: {
        companyId: {
          in: allCompanyIds,
        },
      },
    });

    const crawledSet = new Set(crawledCompanies.map((c) => c.companyId));
    companyIdsToCrawl = allCompanyIds.filter((id) => !crawledSet.has(id));
    console.log(
      `Total companies: ${allCompanyIds.length} | Already crawled: ${crawledSet.size} | Remaining: ${companyIdsToCrawl.length}`,
    );
  }

  // 2. Determine failed exclusion
  let failedIds = new Set<number>();
  if (!options.retryFailed) {
    failedIds = await loadFailedCompanyIds(FAILED_LOG_FILE);
    if (failedIds.size > 0) {
      console.log(
        `Loaded ${failedIds.size} failed companies from log. Use --retry-failed to include them.`,
      );
      companyIdsToCrawl = companyIdsToCrawl.filter((id) => !failedIds.has(id));
    }
  }

  const total = companyIdsToCrawl.length;

  if (total === 0) {
    console.log("Nothing to do. All remaining companies already have products crawled or were previously failed.");
    return;
  }

  let result: AggregateResult;

  if (options.pool > 1) {
    console.log(`Starting crawl with pool size=${options.pool} (continuous workers)`);
    result = await runPool(companyIdsToCrawl, options.pool, service);
  } else {
    console.log(
      `Starting crawl with batch size=${options.batch} and delay=${options.delayMs}ms`,
    );
    result = await runBatches(companyIdsToCrawl, options.batch, options.delayMs, service);
  }

  // 3. Save failed IDs (deduplicate and sort)
  const uniqueFailedIds = [...new Set([...failedIds, ...result.failedIds])].sort((a, b) => a - b);
  await saveFailedCompanyIds(FAILED_LOG_FILE, uniqueFailedIds);
  console.log(
    `Saved failed list to ${FAILED_LOG_FILE} (${uniqueFailedIds.length} entries)`,
  );

  console.log(
    [
      "Done.",
      `total=${total}`,
      `crawled=${result.crawled}`,
      `skipped=${result.skipped}`,
      `failed=${result.failed}`,
      `totalSaved=${result.totalSaved}`,
    ].join(" | "),
  );
}

/**
 * Batch mode: runs N companies at once via Promise.all, waits for the whole
 * batch to finish before starting the next one. If one company is slow, the
 * entire batch is held up.
 */
async function runBatches(
  companyIds: number[],
  batchSize: number,
  delayMs: number,
  service: ProductCrawlerService,
): Promise<AggregateResult> {
  const total = companyIds.length;
  let crawled = 0;
  let skipped = 0;
  let failed = 0;
  let totalSaved = 0;
  const failedIds: number[] = [];

  const totalBatches = Math.ceil(total / batchSize);

  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    const startIdx = batchIndex * batchSize;
    const batchIds = companyIds.slice(startIdx, startIdx + batchSize);
    const batchNum = batchIndex + 1;

    const batchResults = await Promise.all(
      batchIds.map(async (companyId, i) => {
        const globalIndex = startIdx + i + 1;
        const prefix = `[${globalIndex}/${total}] batch ${batchNum}/${totalBatches} companyId=${companyId}`;

        try {
          const result = await service.crawlCompanyProducts({
            companyId,
            force: false,
          });

          if (result.skipped) {
            return { type: "skipped" as const, reason: result.reason, prefix };
          }
          return { type: "crawled" as const, saved: result.saved, prefix };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return { type: "failed" as const, companyId, message, prefix };
        }
      }),
    );

    for (const r of batchResults) {
      switch (r.type) {
        case "skipped":
          skipped++;
          console.log(`${r.prefix} | SKIPPED | ${r.reason}`);
          break;
        case "crawled":
          crawled++;
          totalSaved += r.saved;
          console.log(`${r.prefix} | CRAWLED | saved=${r.saved}`);
          break;
        case "failed":
          failed++;
          failedIds.push(r.companyId);
          console.error(`${r.prefix} | ERROR | ${r.message}`);
          break;
      }
    }

    // Delay between batches, skip after the last one
    if (batchIndex < totalBatches - 1) {
      await sleep(delayMs);
    }
  }

  return { crawled, skipped, failed, totalSaved, failedIds };
}

/**
 * Pool mode: maintains <poolSize> workers that continuously pick up the
 * next company from the shared queue as soon as a slot becomes free.
 * No batch waiting — a slow company never blocks the others.
 */
async function runPool(
  companyIds: number[],
  poolSize: number,
  service: ProductCrawlerService,
): Promise<AggregateResult> {
  const total = companyIds.length;

  // Shared queue — each worker pulls the next task when ready.
  // Safe in JS because only one synchronous chunk runs at a time.
  const queue = companyIds.map((companyId, index) => ({
    companyId,
    globalIndex: index + 1,
  }));

  let crawled = 0;
  let skipped = 0;
  let failed = 0;
  let totalSaved = 0;
  const failedIds: number[] = [];

  async function worker() {
    while (true) {
      const task = queue.shift();
      if (!task) break;

      const prefix = `[${task.globalIndex}/${total}] pool companyId=${task.companyId}`;

      try {
        const result = await service.crawlCompanyProducts({
          companyId: task.companyId,
          force: false,
        });

        if (result.skipped) {
          skipped++;
          console.log(`${prefix} | SKIPPED | ${result.reason}`);
        } else {
          crawled++;
          totalSaved += result.saved;
          console.log(`${prefix} | CRAWLED | saved=${result.saved}`);
        }
      } catch (error) {
        failed++;
        failedIds.push(task.companyId);
        const message = error instanceof Error ? error.message : String(error);
        console.error(`${prefix} | ERROR | ${message}`);
      }
    }
  }

  const workers = Array.from({ length: poolSize }, () => worker());
  await Promise.all(workers);

  return { crawled, skipped, failed, totalSaved, failedIds };
}

async function loadFailedCompanyIds(filePath: string): Promise<Set<number>> {
  try {
    const text = await Bun.file(filePath).text();
    const ids = text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map(Number)
      .filter((n) => !Number.isNaN(n));
    return new Set(ids);
  } catch {
    return new Set();
  }
}

async function saveFailedCompanyIds(filePath: string, ids: number[]): Promise<void> {
  const content = ids.join("\n") + "\n";
  await Bun.write(filePath, content);
}

function parseCliOptions(argv: string[]): CliOptions {
  const options: CliOptions = {
    delayMs: DEFAULT_DELAY_MS,
    force: false,
    batch: 1,
    retryFailed: false,
    pool: 1,
  };

  for (const arg of argv) {
    if (arg === "--force") {
      options.force = true;
      continue;
    }

    if (arg === "--retry-failed") {
      options.retryFailed = true;
      continue;
    }

    const [key, value] = arg.split("=");

    if (!value) continue;

    if (key === "--delay-ms") {
      const parsed = Number(value);
      if (!Number.isInteger(parsed) || parsed < 0) {
        throw new Error("--delay-ms must be a non-negative integer.");
      }
      options.delayMs = parsed;
    }

    if (key === "--batch") {
      const parsed = Number(value);
      if (!Number.isInteger(parsed) || parsed < 1) {
        throw new Error("--batch must be a positive integer.");
      }
      options.batch = parsed;
    }

    if (key === "--pool") {
      const parsed = Number(value);
      if (!Number.isInteger(parsed) || parsed < 1) {
        throw new Error("--pool must be a positive integer.");
      }
      options.pool = parsed;
    }
  }

  if (options.pool > 1 && options.batch > 1) {
    console.warn(
      "Both --batch and --pool are set. Pool mode takes precedence (--pool is used).",
    );
  }

  return options;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
