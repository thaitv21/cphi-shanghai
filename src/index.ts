import { parseCliOptions } from "./cli";
import { getCrawlOptions } from "./config";
import { ExhibitorCrawler } from "./exhibitorCrawler";
import { ExhibitorRepository } from "./exhibitorRepository";
import { prisma } from "./prismaClient";

async function main() {
  const options = getCrawlOptions();
  const cliOptions = parseCliOptions(Bun.argv.slice(2));
  const exhibitorRepository = new ExhibitorRepository(prisma);
  const crawler = new ExhibitorCrawler(options, exhibitorRepository);
  const data = await crawler.crawl(cliOptions);

  console.log(
    [
      `Saved ${data.saved} exhibitors`,
      `page ${data.page}/${data.lastPage}`,
      `limit ${data.limit}`,
      `total ${data.total}`,
    ].join(" | "),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => {
  await prisma.$disconnect();
});
