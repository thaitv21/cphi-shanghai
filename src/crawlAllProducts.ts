import { ProductCrawlerService } from "./productCrawlerService";
import { prisma } from "./prismaClient";

/**
 * Delay between each company crawl to avoid hammering remote servers.
 * Override via --delay-ms=<ms> CLI flag.
 */
const DEFAULT_DELAY_MS = 5_000;

type CliOptions = {
  delayMs: number;
  force: boolean;
  concurrency: number;
};

async function main() {
  const options = parseCliOptions(Bun.argv.slice(2));
  const service = new ProductCrawlerService(prisma);

  // Fetch all distinct companyIds that have an exhibitor record.
  const exhibitors = await prisma.exhibitor.findMany({
    select: {
      companyId: true,
    },
    distinct: ["companyId"],
    orderBy: {
      companyId: "asc",
    },
  });

  const total = exhibitors.length;
  console.log(`Found ${total} companies to process.`);

  if (total === 0) {
    console.log("Nothing to do. Crawl exhibitors first.");
    return;
  }

  let crawled = 0;
  let skipped = 0;
  let failed = 0;
  let totalSaved = 0;

  for (let i = 0; i < exhibitors.length; i++) {
    const { companyId } = exhibitors[i];
    const prefix = `[${i + 1}/${total}] companyId=${companyId}`;

    try {
      const result = await service.crawlCompanyProducts({
        companyId,
        force: options.force,
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
      const message = error instanceof Error ? error.message : String(error);
      console.error(`${prefix} | ERROR | ${message}`);
    }

    // Delay between requests, but skip delay after the last company.
    if (i < exhibitors.length - 1) {
      await sleep(options.delayMs);
    }
  }

  console.log(
    [
      "Done.",
      `total=${total}`,
      `crawled=${crawled}`,
      `skipped=${skipped}`,
      `failed=${failed}`,
      `totalSaved=${totalSaved}`,
    ].join(" | "),
  );
}

function parseCliOptions(argv: string[]): CliOptions {
  const options: CliOptions = {
    delayMs: DEFAULT_DELAY_MS,
    force: false,
    concurrency: 1,
  };

  for (const arg of argv) {
    if (arg === "--force") {
      options.force = true;
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
