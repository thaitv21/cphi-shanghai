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
  ];

  for (const exhibitor of exhibitors) {
    worksheet.addRow({
      name: exhibitor.companyNameEn ?? "",
      hallNo: exhibitor.hallNo ?? "",
      boothNo: exhibitor.boothNo ?? "",
      countriesAndRegions: exhibitor.countryEn ?? "",
      productZones: exhibitor.categoryEn ?? "",
    });
  }

  worksheet.getRow(1).font = { bold: true };
  worksheet.views = [{ state: "frozen", ySplit: 1 }];
  worksheet.autoFilter = {
    from: "A1",
    to: "E1",
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
