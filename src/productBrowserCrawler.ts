import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import puppeteer, { type Browser, type Page } from "puppeteer-core";
import type { ScrapedProduct } from "./productTypes";

const DEFAULT_CHROME_EXECUTABLE_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PRODUCT_PAGE_LIMIT = 20;
const NAVIGATION_TIMEOUT_MS = 15_000;

export class ProductBrowserCrawler {
  constructor(
    private readonly chromeExecutablePath =
      Bun.env.CHROME_EXECUTABLE_PATH ?? DEFAULT_CHROME_EXECUTABLE_PATH,
  ) {}

  async crawl(homepage: string): Promise<ScrapedProduct[]> {
    const productPages = await this.withPage((page) => this.discoverProductPages(page, homepage));
    const products: ScrapedProduct[] = [];
    let pageIndex = 0;

    while (pageIndex < productPages.length && pageIndex < PRODUCT_PAGE_LIMIT) {
      const productPageUrl = productPages[pageIndex];
      pageIndex += 1;

      const result = await this.withPage(async (page) => {
        await this.goto(page, productPageUrl);
        await page.waitForSelector("ul#dataContain.company_pro_product > li", {
          timeout: 10_000,
        }).catch(() => undefined);

        return {
          products: await this.extractProducts(page),
          paginationUrls: await this.extractProductPaginationUrls(page),
        };
      });

      products.push(...result.products);

      for (const paginationUrl of result.paginationUrls) {
        if (productPages.includes(paginationUrl) || productPages.length >= PRODUCT_PAGE_LIMIT) {
          continue;
        }

        productPages.push(paginationUrl);
      }
    }

    return this.dedupeProducts(products);
  }

  private async withPage<T>(callback: (page: Page) => Promise<T>): Promise<T> {
    let browser: Browser | null = null;

    try {
      const userDataDir = mkdtempSync(join(tmpdir(), "cphi-product-crawler-"));

      browser = await puppeteer.launch({
        executablePath: this.chromeExecutablePath,
        headless: true,
        pipe: true,
        userDataDir,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-background-networking",
          "--disable-default-apps",
          "--disable-dev-shm-usage",
          "--disable-extensions",
          "--disable-sync",
          "--no-first-run",
          "--no-default-browser-check",
        ],
      });

      const page = await browser.newPage();
      await page.setUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36",
      );
      await page.setViewport({ width: 1440, height: 1000 });

      return await callback(page);
    } finally {
      const browserProcess = browser?.process();

      await browser?.close().catch(() => undefined);

      if (browserProcess && browserProcess.exitCode === null) {
        browserProcess.kill("SIGKILL");
      }
    }
  }

  private async discoverProductPages(page: Page, homepage: string): Promise<string[]> {
    await this.goto(page, homepage);

    const productLinks = await page.evaluate((currentUrl) => {
      const links = Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href]"))
        .map((anchor) => ({
          text: (anchor.textContent ?? "").replace(/\s+/g, " ").trim(),
          href: anchor.href,
        }));

      const navProductLink = links.find((link) => {
        const url = new URL(link.href, currentUrl);

        return link.text.toLowerCase() === "products" && url.pathname.endsWith("/product");
      });

      if (navProductLink) {
        return [navProductLink.href];
      }

      return links
        .filter((link) => {
          const url = new URL(link.href, currentUrl);

          return url.pathname.includes("/company-home/") && url.pathname.endsWith("/product");
        })
        .map((link) => link.href);
    }, homepage);

    return this.uniqueUrls(productLinks.length > 0 ? productLinks : [homepage]).slice(0, PRODUCT_PAGE_LIMIT);
  }

  private async extractProducts(page: Page): Promise<ScrapedProduct[]> {
    const sourcePageUrl = page.url();

    return page.evaluate((currentUrl) => {
      function normalizeText(value: string | null | undefined): string {
        return (value ?? "").replace(/\s+/g, " ").trim();
      }

      function normalizeUrl(value: string | null | undefined): string | null {
        if (!value) {
          return null;
        }

        try {
          return new URL(value, window.location.href).href;
        } catch {
          return null;
        }
      }

      return Array.from(document.querySelectorAll<HTMLLIElement>("ul#dataContain.company_pro_product > li"))
        .map((item) => {
          const titleAnchor = item.querySelector<HTMLAnchorElement>("a.company_pro_pro_p[href]");
          const image = item.querySelector<HTMLImageElement>(".company_pro_pro_img img");
          const name = normalizeText(titleAnchor?.textContent ?? image?.getAttribute("alt"));

          return {
            name,
            url: normalizeUrl(titleAnchor?.getAttribute("href")),
            imageUrl: normalizeUrl(image?.getAttribute("src") ?? image?.getAttribute("data-src")),
            sourcePageUrl: currentUrl,
          };
        })
        .filter((product) => {
          if (!product.url || product.name.length < 2) {
            return false;
          }

          return product.url.includes("/products/");
        });
    }, sourcePageUrl);
  }

  private async extractProductPaginationUrls(page: Page): Promise<string[]> {
    const urls = await page.evaluate(() => {
      const linkUrls = Array.from(document.querySelectorAll<HTMLAnchorElement>(".company_new_page .page-num a[href]"))
        .map((anchor) => anchor.href)
        .filter((href) => {
          if (!href || href.endsWith("#")) {
            return false;
          }

          const pathname = new URL(href).pathname;

          return pathname.includes("/company-home/") && pathname.includes("/product/_page_");
        });

      const requestUri = document.querySelector<HTMLInputElement>("#hiddenRequestUri")?.value;
      const totalPage = Number(document.querySelector<HTMLInputElement>("#hiddenTotalPage")?.value ?? 0);
      const hiddenUrls: string[] = [];

      if (requestUri && Number.isInteger(totalPage) && totalPage > 1) {
        for (let page = 2; page <= totalPage; page += 1) {
          hiddenUrls.push(new URL(`${requestUri}/_page_${page}`, window.location.origin).href);
        }
      }

      return [...linkUrls, ...hiddenUrls];
    });

    return this.uniqueUrls(urls).slice(0, PRODUCT_PAGE_LIMIT);
  }

  private async goto(page: Page, url: string): Promise<void> {
    try {
      await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: NAVIGATION_TIMEOUT_MS,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // Re-throw so outer layers can record this company as failed.
      throw new Error(`Navigation failed for ${url}: ${message}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }

  private uniqueUrls(urls: string[]): string[] {
    return Array.from(new Set(urls.filter(Boolean)));
  }

  private dedupeProducts(products: ScrapedProduct[]): ScrapedProduct[] {
    const seen = new Set<string>();
    const deduped: ScrapedProduct[] = [];

    for (const product of products) {
      const key = `${product.url ?? ""}|${product.name}`.toLowerCase();

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      deduped.push(product);
    }

    return deduped;
  }
}
