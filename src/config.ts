export const CPHI_BASE_URL = "https://exhibitors.cphi-china.cn";
export const CPHI_INDEX_PATH = "/api/front/index";

export type CrawlOptions = {
  page: number;
  limit: number;
  exhibitor: string;
  cookie: string;
};

export function getCrawlOptions(): CrawlOptions {
  return {
    page: Number(Bun.env.CPHI_PAGE ?? 1),
    limit: Number(Bun.env.CPHI_LIMIT ?? 10),
    exhibitor: Bun.env.CPHI_EXHIBITOR ?? "shanghai",
    cookie: Bun.env.CPHI_COOKIE ?? "",
  };
}

export function buildHeaders(cookie: string): Record<string, string> {
  return {
    Accept: "*/*",
    "Accept-Language": "en-US,en;q=0.9,vi;q=0.8",
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    Origin: "https://exhibitors.cphi-china.cn",
    Referer: "https://exhibitors.cphi-china.cn/shanghai?language=en",
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36",
    "X-Requested-With": "XMLHttpRequest",
    Cookie: cookie,
  };
}
