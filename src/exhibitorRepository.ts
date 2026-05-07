import type { PrismaClient } from "@prisma/client";
import type { CphiExhibitor } from "./types";

export class ExhibitorRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async upsertMany(exhibitors: CphiExhibitor[]): Promise<number> {
    for (const exhibitor of exhibitors) {
      await this.upsert(exhibitor);
    }

    return exhibitors.length;
  }

  private async upsert(exhibitor: CphiExhibitor): Promise<void> {
    const data = {
      apiId: exhibitor.id,
      exhibitionId: exhibitor.exhibition_id,
      exhibitionName: exhibitor.exhibition_name,
      memberId: exhibitor.member_id,
      companyId: exhibitor.company_id,
      boothNo: exhibitor.booth_no,
      hallNo: exhibitor.hall_no,
      exhibitionAreaClassificationId: exhibitor.exhibition_area_classification_id,
      exhibitionAreaClassificationName: exhibitor.exhibition_area_classification_name,
      exhibitionAreaClassificationNameEn: exhibitor.exhibition_area_classification_name_en,
      companyLogo: exhibitor.company_logo,
      country: exhibitor.country,
      countryEn: exhibitor.country_en,
      companyName: exhibitor.cc_company_name,
      companyNameEn: exhibitor.cc_company_name_en,
      category: exhibitor.cate,
      categoryEn: exhibitor.cate_en,
      homepage: exhibitor.homepage,
      homepageEn: exhibitor.homepage_en,
      rawJson: JSON.stringify(exhibitor),
      companyRawJson: JSON.stringify(exhibitor.company),
      sourceCreatedAt: exhibitor.created_at,
      sourceUpdatedAt: exhibitor.updated_at,
      crawledAt: new Date(),
    };

    await this.prisma.exhibitor.upsert({
      where: {
        apiId: exhibitor.id,
      },
      create: data,
      update: data,
    });
  }
}
