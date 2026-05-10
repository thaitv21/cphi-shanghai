import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import ExcelJS from "exceljs";
import { prisma } from "./prismaClient";

const DEFAULT_OUTPUT_PATH = "exports/exhibitors.xlsx";

type ExportOptions = {
  output: string;
};

async function main() {
  const options = parseExportOptions(Bun.argv.slice(2));
  const outputPath = resolve(options.output);
  mkdirSync(dirname(outputPath), { recursive: true });

  const exhibitors = await prisma.exhibitor.findMany({
    orderBy: [
      {
        companyNameEn: "asc",
      },
      {
        boothNo: "asc",
      },
    ],
    select: {
      companyNameEn: true,
      hallNo: true,
      boothNo: true,
      countryEn: true,
      categoryEn: true,
      companyRawJson: true,
      products: {
        select: {
          name: true,
          url: true,
        },
      },
    },
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "cphi-shanghai-crawler";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Exhibitors");
  worksheet.columns = [
    { header: "Name", key: "name", width: 42 },
    { header: "Hall No", key: "hallNo", width: 14 },
    { header: "Booth No", key: "boothNo", width: 16 },
    { header: "Countries & Regions", key: "countriesAndRegions", width: 26 },
    { header: "Product Zones", key: "productZones", width: 32 },
    { header: "Products", key: "products", width: 120 },
    { header: "Phone", key: "phone", width: 28 },
    { header: "Email", key: "email", width: 32 },
    { header: "Address", key: "address", width: 60 },
  ];

  for (const exhibitor of exhibitors) {
    const productText = exhibitor.products.map(p => p.name).join(", ") || '';

    let phone = "";
    let email = "";
    let address = "";
    if (exhibitor.companyRawJson) {
      try {
        const company = JSON.parse(exhibitor.companyRawJson) as Record<string, unknown>;
        phone = String(company.company_telephone ?? "");
        email = String(company.message_email ?? "");
        const relateCompany = company.relate_company as Record<string, unknown> | undefined;
        address = String(relateCompany?.detail_address ?? company.detail_address ?? "");
      } catch {
        // leave empty if JSON is malformed
      }
    }

    worksheet.addRow({
      name: exhibitor.companyNameEn ?? "",
      hallNo: exhibitor.hallNo ?? "",
      boothNo: exhibitor.boothNo ?? "",
      countriesAndRegions: exhibitor.countryEn ?? "",
      productZones: exhibitor.categoryEn ?? "",
      products: productText,
      phone,
      email,
      address,
    });
  }

  worksheet.getRow(1).font = { bold: true };
  worksheet.views = [{ state: "frozen", ySplit: 1 }];
  worksheet.autoFilter = {
    from: "A1",
    to: "I1",
  };

  await workbook.xlsx.writeFile(outputPath);

  console.log(`Exported ${exhibitors.length} exhibitors to ${outputPath}`);
}

function parseExportOptions(argv: string[]): ExportOptions {
  const outputArg = argv.find((arg) => arg.startsWith("--output="));

  return {
    output: outputArg?.split("=").slice(1).join("=") || DEFAULT_OUTPUT_PATH,
  };
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
