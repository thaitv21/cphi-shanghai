import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { Database } from "bun:sqlite";

const databasePath = resolve("prisma/dev.db");

mkdirSync(dirname(databasePath), { recursive: true });

const db = new Database(databasePath);
const hasExistingExhibitorTable = Boolean(
  db
    .query(`SELECT 1 AS found FROM sqlite_master WHERE type = 'table' AND name = 'Exhibitor'`)
    .get(),
);

db.run(`DROP TABLE IF EXISTS "Exhibitor_new";`);
db.run(`
  CREATE TABLE IF NOT EXISTS "Exhibitor_new" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "apiId" INTEGER NOT NULL,
    "exhibitionId" INTEGER NOT NULL,
    "exhibitionName" TEXT,
    "memberId" INTEGER NOT NULL,
    "companyId" INTEGER NOT NULL,
    "boothNo" TEXT,
    "hallNo" TEXT,
    "exhibitionAreaClassificationId" TEXT,
    "exhibitionAreaClassificationName" TEXT,
    "exhibitionAreaClassificationNameEn" TEXT,
    "companyLogo" TEXT,
    "country" TEXT,
    "countryEn" TEXT,
    "companyName" TEXT,
    "companyNameEn" TEXT,
    "category" TEXT,
    "categoryEn" TEXT,
    "homepage" TEXT,
    "homepageEn" TEXT,
    "rawJson" TEXT NOT NULL,
    "companyRawJson" TEXT NOT NULL,
    "sourceCreatedAt" TEXT,
    "sourceUpdatedAt" TEXT,
    "crawledAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

if (hasExistingExhibitorTable) {
  db.run(`
    INSERT OR IGNORE INTO "Exhibitor_new" (
      "id",
      "apiId",
      "exhibitionId",
      "exhibitionName",
      "memberId",
      "companyId",
      "boothNo",
      "hallNo",
      "exhibitionAreaClassificationId",
      "exhibitionAreaClassificationName",
      "exhibitionAreaClassificationNameEn",
      "companyLogo",
      "country",
      "countryEn",
      "companyName",
      "companyNameEn",
      "category",
      "categoryEn",
      "homepage",
      "homepageEn",
      "rawJson",
      "companyRawJson",
      "sourceCreatedAt",
      "sourceUpdatedAt",
      "crawledAt",
      "createdAt",
      "updatedAt"
    )
    SELECT
      "id",
      "apiId",
      "exhibitionId",
      "exhibitionName",
      "memberId",
      "companyId",
      "boothNo",
      "hallNo",
      "exhibitionAreaClassificationId",
      "exhibitionAreaClassificationName",
      "exhibitionAreaClassificationNameEn",
      "companyLogo",
      "country",
      "countryEn",
      "companyName",
      "companyNameEn",
      "category",
      "categoryEn",
      "homepage",
      "homepageEn",
      "rawJson",
      "companyRawJson",
      "sourceCreatedAt",
      "sourceUpdatedAt",
      "crawledAt",
      "createdAt",
      "updatedAt"
    FROM "Exhibitor";
  `);
}

db.run(`DROP TABLE IF EXISTS "Exhibitor";`);
db.run(`ALTER TABLE "Exhibitor_new" RENAME TO "Exhibitor";`);
db.run(`CREATE UNIQUE INDEX IF NOT EXISTS "Exhibitor_apiId_key" ON "Exhibitor"("apiId");`);
db.run(`CREATE INDEX IF NOT EXISTS "Exhibitor_companyId_idx" ON "Exhibitor"("companyId");`);
db.run(`CREATE INDEX IF NOT EXISTS "Exhibitor_companyNameEn_idx" ON "Exhibitor"("companyNameEn");`);
db.run(`CREATE INDEX IF NOT EXISTS "Exhibitor_boothNo_idx" ON "Exhibitor"("boothNo");`);

db.run(`
  CREATE TABLE IF NOT EXISTS "Product" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "productKey" TEXT NOT NULL,
    "exhibitorId" INTEGER NOT NULL,
    "companyId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT,
    "imageUrl" TEXT,
    "rawJson" TEXT NOT NULL,
    "crawledAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Product_exhibitorId_fkey" FOREIGN KEY ("exhibitorId") REFERENCES "Exhibitor" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  );
`);
db.run(`CREATE UNIQUE INDEX IF NOT EXISTS "Product_productKey_key" ON "Product"("productKey");`);
db.run(`CREATE INDEX IF NOT EXISTS "Product_companyId_idx" ON "Product"("companyId");`);
db.run(`CREATE INDEX IF NOT EXISTS "Product_exhibitorId_idx" ON "Product"("exhibitorId");`);
db.run(`CREATE INDEX IF NOT EXISTS "Product_name_idx" ON "Product"("name");`);

db.close();

console.log(`SQLite database is ready at ${databasePath}`);
