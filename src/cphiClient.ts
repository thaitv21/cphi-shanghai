import { CPHI_INDEX_PATH, type CrawlOptions } from "./config";
import { CphiHttpClient } from "./httpClient";
import type { CphiIndexResponse } from "./types";

export class CphiClient {
  private readonly httpClient: CphiHttpClient;

  constructor(private readonly options: CrawlOptions) {
    if (!options.cookie) {
      throw new Error("Missing CPHI_COOKIE. Copy .env.example to .env and set a fresh cookie.");
    }

    this.httpClient = new CphiHttpClient(options.cookie);
  }

  async fetchExhibitors(): Promise<CphiIndexResponse> {
    const body = new URLSearchParams({
      page: String(this.options.page),
      limit: String(this.options.limit),
      exhitor: this.options.exhibitor,
    });

    return this.httpClient.post<CphiIndexResponse>(CPHI_INDEX_PATH, body);
  }
}
