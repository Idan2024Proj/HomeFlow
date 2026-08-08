# Israeli supermarket price feeds — discovery notes (verified 2026-08-08)

## Reference only
Historical code: https://github.com/yonicd/supermarketprices (`fetch_files/cerberus_fetch.r`)
Do not copy URLs/usernames blindly.

## Provider 1 (implemented for search demo): Shufersal
- Portal: https://prices.shufersal.co.il
- Listing: `FileObject/UpdateCategory?catID=...`
  - catID=5 → Stores
  - catID=2 → PriceFull
  - catID=4 → PromoFull
- Auth: none (public Azure blob signed URLs)
- Format: `.gz` (real gzip) → UTF-8 XML
- Example PriceFull: `PriceFull7290027600007-{sub}-{store}-{YYYYMMDD}-{HHMMSS}.gz`
- Verified: downloaded live PriceFull (~5980 items), Hebrew names OK, milk prices present

## Provider 2 (verified listing, download blocked in our FTPS client): Cerberus / Rami Levi
- Host: `url.retail.publishedprices.co.il` (FTPS)
- Username example: `ramilevi` / empty password
- Web UI: https://publishedprices.co.il/login (legacy form login unreliable from scripts)
- Listing OK with `basic-ftp` + `allowSeparateTransferHost: true` (~2064 files)
- Example Stores: `Stores7290058140886-000-20260808-050500.xml` (UTF-16 LE, 99 stores)
- Example PriceFull: `PriceFull7290058140886-001-001-20260808-121500.gz`
- Issue: RETR completes but local file size 0 with current basic-ftp transfer — needs alternate download strategy before production importer for Cerberus

## First production importer choice
Use **Shufersal** until Cerberus binary download is fixed.
