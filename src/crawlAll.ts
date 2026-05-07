import { getCrawlOptions } from "./config";
import { ExhibitorCrawler } from "./exhibitorCrawler";
import { ExhibitorRepository } from "./exhibitorRepository";
import { prisma } from "./prismaClient";

const CRAWL_LIMIT = 100;
const REQUEST_DELAY_MS = 10_000;

async function main() {
  const options = getCrawlOptions();
  const exhibitorRepository = new ExhibitorRepository(prisma);
  const crawler = new ExhibitorCrawler(
    {
      ...options,
      page: 1,
      limit: CRAWL_LIMIT,
    },
    exhibitorRepository,
  );

  let page = 1;
  let lastPage: number | null = null;
  let totalSaved = 0;

  while (lastPage === null || page <= lastPage) {
    const startedAt = new Date();
    console.log(`[${startedAt.toISOString()}] Crawling page ${page}, limit ${CRAWL_LIMIT}`);

    const result = await crawler.crawl({
      page,
      limit: CRAWL_LIMIT,
    });

    lastPage = result.lastPage;
    totalSaved += result.saved;

    console.log(
      [
        `Saved ${result.saved} exhibitors`,
        `page ${result.page}/${result.lastPage}`,
        `total ${result.total}`,
        `accumulated ${totalSaved}`,
      ].join(" | "),
    );

    page += 1;

    if (page <= lastPage) {
      await sleep(REQUEST_DELAY_MS);
    }
  }

  console.log(`Done. Saved ${totalSaved} exhibitors across ${lastPage ?? 0} pages.`);
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
