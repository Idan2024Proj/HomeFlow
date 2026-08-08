# Supermarket price feeds — discovery notes (2026-08-08)

Reference only (do not copy): https://github.com/yonicd/supermarketprices  
Historical Cerberus login host: `https://url.retail.publishedprices.co.il/login`  
Historical usernames: `ramilevi`, `osherad`, `yohananof`, …

## Cerberus / Rami Levi — FAILED verification

| Check | Result |
|-------|--------|
| `https://url.retail.publishedprices.co.il` | DNS/TLS fetch failed |
| `https://publishedprices.co.il/login` | Live (Cerberus Web Client) |
| Username-only login (`RamiLevi` / `ramilevi`, empty password) | **Rejected** — redirects back to `/login`, `/file` → 302 login |
| Password field | Present / required today |

**Decision:** do not fake a Cerberus adapter. Revisit when valid credentials or a working public listing API is available.

## Shufersal — VERIFIED (first provider)

| Field | Value |
|-------|--------|
| Portal | https://prices.shufersal.co.il |
| Auth | None for file listing / Azure blob download |
| Listing | `GET /FileObject/UpdateCategory?catID={n}&storeId={id}&sort=Time&sortdir=DESC&page=1` |
| Download | Time-limited Azure Blob URL (`pricesprodpublic.blob.core.windows.net`) |
| Format | `.gz` → UTF-8 XML |
| Chain ID | `7290027600007` |

### Category IDs (verified)

| catID | Kind | Example filename |
|------:|------|------------------|
| 5 | Stores | `Stores7290027600007-000-20260808-020` |
| 2 | PriceFull | `PriceFull7290027600007-001-357-20260808-034000` |
| 1 | Price (delta) | `Price7290027600007-…` |
| 4 | PromoFull | `PromoFull7290027600007-…` |
| 3 | Promo (delta) | `Promo7290027600007-…` |

### Spot checks

- Stores XML: **420** branches, Hebrew names OK
- PriceFull sample store: **~5,980** items, Hebrew `ItemName` OK
- Item fields mapped: `ItemCode`, `ItemName`, `ItemPrice`, `ManufactureName`, `ManufactureItemDescription`, `UnitOfMeasure`, `Quantity`, `UnitOfMeasurePrice`, `AllowDiscount`, `PriceUpdateTime`

## Import commands

```bash
# 1) Run migration in Supabase SQL Editor:
#    supabase/migrations/20260307000500_supermarket_prices.sql

npx tsx --env-file=.env.local scripts/import-shufersal.ts --stores
npx tsx --env-file=.env.local scripts/import-shufersal.ts --prices --store=357
```

Dev debug (blocked in production unless `ALLOW_PRICE_DEBUG=true`): `/dev/prices`
