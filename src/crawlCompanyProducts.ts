import { ProductCrawlerService } from "./productCrawlerService";
import type { CrawlCompanyProductsInput } from "./productTypes";
import { prisma } from "./prismaClient";

type CliInput = {
  companyId?: number;
  exhibitorApiId?: number;
  force?: boolean;
};

async function main() {
  const input = parseCliInput(Bun.argv.slice(2));
  const service = new ProductCrawlerService(prisma);
  const result = await service.crawlCompanyProducts(input);

  console.log(
    [
      result.skipped ? "Skipped" : "Crawled",
      `companyId ${result.companyId}`,
      `exhibitorApiId ${result.exhibitorApiId}`,
      `saved ${result.saved}`,
      result.reason ? `reason ${result.reason}` : null,
    ]
      .filter(Boolean)
      .join(" | "),
  );
}

function parseCliInput(argv: string[]): CrawlCompanyProductsInput {
  const input: CliInput = {};

  for (const arg of argv) {
    if (arg === "--force") {
      input.force = true;
      continue;
    }

    const [key, value] = arg.split("=");

    if (!value) {
      continue;
    }

    if (key === "--company-id") {
      input.companyId = parsePositiveInteger(value, "company-id");
    }

    if (key === "--exhibitor-api-id") {
      input.exhibitorApiId = parsePositiveInteger(value, "exhibitor-api-id");
    }
  }

  if ((input.companyId && input.exhibitorApiId) || (!input.companyId && !input.exhibitorApiId)) {
    throw new Error("Pass exactly one of --company-id=<id> or --exhibitor-api-id=<id>.");
  }

  if (input.companyId) {
    return {
      companyId: input.companyId,
      force: input.force,
    };
  }

  if (input.exhibitorApiId) {
    return {
      exhibitorApiId: input.exhibitorApiId,
      force: input.force,
    };
  }

  throw new Error("Pass exactly one of --company-id=<id> or --exhibitor-api-id=<id>.");
}

function parsePositiveInteger(value: string, name: string): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return parsed;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
