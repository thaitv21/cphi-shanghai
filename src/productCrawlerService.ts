import type { PrismaClient } from "@prisma/client";
import { ProductBrowserCrawler } from "./productBrowserCrawler";
import { ProductRepository } from "./productRepository";
import type { CrawlCompanyProductsInput, CrawlCompanyProductsResult } from "./productTypes";

export class ProductCrawlerService {
  private readonly productRepository: ProductRepository;
  private readonly browserCrawler: ProductBrowserCrawler;

  constructor(
    private readonly prisma: PrismaClient,
    productRepository = new ProductRepository(prisma),
    browserCrawler = new ProductBrowserCrawler(),
  ) {
    this.productRepository = productRepository;
    this.browserCrawler = browserCrawler;
  }

  async crawlCompanyProducts(input: CrawlCompanyProductsInput): Promise<CrawlCompanyProductsResult> {
    const exhibitor = await this.findExhibitor(input);

    if (!exhibitor) {
      throw new Error("Exhibitor not found. Crawl exhibitors first or check company id.");
    }

    const homepage = exhibitor.homepageEn ?? exhibitor.homepage;

    if (!homepage) {
      return {
        skipped: true,
        reason: "Missing company homepage.",
        companyId: exhibitor.companyId,
        exhibitorApiId: exhibitor.apiId,
        saved: 0,
        products: [],
      };
    }

    const hasProducts = await this.productRepository.hasProductsByCompanyId(exhibitor.companyId);

    if (hasProducts && !input.force) {
      return {
        skipped: true,
        reason: "Products already exist in database.",
        companyId: exhibitor.companyId,
        exhibitorApiId: exhibitor.apiId,
        saved: 0,
        products: [],
      };
    }

    const products = await this.browserCrawler.crawl(homepage);
    const saved = await this.productRepository.upsertMany({
      exhibitorId: exhibitor.id,
      companyId: exhibitor.companyId,
      products,
    });

    return {
      skipped: false,
      companyId: exhibitor.companyId,
      exhibitorApiId: exhibitor.apiId,
      saved,
      products,
    };
  }

  private findExhibitor(input: CrawlCompanyProductsInput) {
    if ("companyId" in input) {
      return this.prisma.exhibitor.findFirst({
        where: {
          companyId: input.companyId,
        },
        orderBy: {
          id: "asc",
        },
      });
    }

    return this.prisma.exhibitor.findUnique({
      where: {
        apiId: input.exhibitorApiId,
      },
    });
  }
}
