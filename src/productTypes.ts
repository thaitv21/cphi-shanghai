export type ScrapedProduct = {
  name: string;
  url: string | null;
  imageUrl: string | null;
  sourcePageUrl: string;
};

export type CrawlCompanyProductsInput =
  | {
      companyId: number;
      exhibitorApiId?: never;
      force?: boolean;
    }
  | {
      exhibitorApiId: number;
      companyId?: never;
      force?: boolean;
    };

export type CrawlCompanyProductsResult = {
  skipped: boolean;
  reason?: string;
  companyId: number;
  exhibitorApiId: number;
  saved: number;
  products: ScrapedProduct[];
};
