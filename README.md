# CPHI Shanghai Crawler

Bun + TypeScript project for crawling exhibitor data from `https://exhibitors.cphi-china.cn`.

## Setup

```bash
bun install
cp .env.example .env
bun run prisma:generate
bun run db:setup
```

Paste the current browser cookie into `CPHI_COOKIE` in `.env`.

## Run

```bash
bun run start
```

Pass page and limit from CLI:

```bash
bun run start --page=1 --limit=50
```

Each run upserts exhibitors into SQLite using `apiId` from the source response.

To crawl all pages sequentially with `limit=100` and a 10 second delay between requests:

```bash
bun run crawl:all
```

Export saved exhibitors to Excel:

```bash
bun run export:excel
```

Custom output path:

```bash
bun run export:excel --output=exports/cphi-shanghai.xlsx
```

Crawl products for one company. The service skips companies that already have products unless `--force` is provided:

```bash
bun run crawl:products --company-id=147308
bun run crawl:products --exhibitor-api-id=31124
bun run crawl:products --company-id=147308 --force
```

For development with watch mode:

```bash
bun run dev
```
