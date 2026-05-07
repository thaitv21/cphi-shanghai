import { createHash } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import type { ScrapedProduct } from "./productTypes";

export class ProductRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async hasProductsByCompanyId(companyId: number): Promise<boolean> {
    const count = await this.prisma.product.count({
      where: {
        companyId,
      },
    });

    return count > 0;
  }

  async upsertMany(input: {
    exhibitorId: number;
    companyId: number;
    products: ScrapedProduct[];
  }): Promise<number> {
    for (const product of input.products) {
      const productKey = this.buildProductKey(input.companyId, product);

      await this.prisma.product.upsert({
        where: {
          productKey,
        },
        create: {
          productKey,
          exhibitorId: input.exhibitorId,
          companyId: input.companyId,
          name: product.name,
          url: product.url,
          imageUrl: product.imageUrl,
          rawJson: JSON.stringify(product),
          crawledAt: new Date(),
        },
        update: {
          name: product.name,
          url: product.url,
          imageUrl: product.imageUrl,
          rawJson: JSON.stringify(product),
          crawledAt: new Date(),
        },
      });
    }

    return input.products.length;
  }

  private buildProductKey(companyId: number, product: ScrapedProduct): string {
    const stableValue = `${companyId}|${product.url ?? ""}|${product.name}`.toLowerCase();

    return createHash("sha1").update(stableValue).digest("hex");
  }
}
