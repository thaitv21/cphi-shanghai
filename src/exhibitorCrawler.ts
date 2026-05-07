import { CphiClient } from "./cphiClient";
import type { CrawlOptions } from "./config";
import { ExhibitorRepository } from "./exhibitorRepository";
import type { ExhibitorCrawlerInput, ExhibitorCrawlerResult } from "./types";

export class ExhibitorCrawler {
  constructor(
    private readonly baseOptions: CrawlOptions,
    private readonly exhibitorRepository: ExhibitorRepository,
  ) {}

  async crawl(input: ExhibitorCrawlerInput = {}): Promise<ExhibitorCrawlerResult> {
    const page = input.page ?? this.baseOptions.page;
    const limit = input.limit ?? this.baseOptions.limit;
    const client = new CphiClient({
      ...this.baseOptions,
      page,
      limit,
    });

    const response = await client.fetchExhibitors();
    if (!response.data?.data) {
      throw new Error(`Unexpected CPHI response shape: ${JSON.stringify(response).slice(0, 500)}`);
    }

    const exhibitors = response.data.data;
    const saved = await this.exhibitorRepository.upsertMany(exhibitors);

    return {
      page: response.data.current_page,
      limit: response.data.per_page,
      total: response.data.total,
      lastPage: response.data.last_page,
      saved,
      exhibitors,
    };
  }
}
