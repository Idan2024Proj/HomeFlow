/**
 * CLI importer for Shufersal public price feeds.
 *
 * npx tsx --env-file=.env.local scripts/import-shufersal.ts --stores
 * npx tsx --env-file=.env.local scripts/import-shufersal.ts --prices --store=357
 */
import fs from "fs";

function loadEnvLocal() {
  if (!fs.existsSync(".env.local")) return;
  for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("=");
    const key = line.slice(0, i).trim();
    const value = line.slice(i + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

async function main() {
  loadEnvLocal();
  const args = process.argv.slice(2);
  const doStores = args.includes("--stores");
  const storeArg = args.find((a) => a.startsWith("--store="));
  const doPrices = args.includes("--prices") || Boolean(storeArg);
  const storeExternalId = storeArg?.split("=")[1];

  const { importShufersalStores, importShufersalStorePrices } = await import(
    "../src/lib/prices/import-shufersal.ts",
  );

  if (!doStores && !doPrices) {
    console.log(`Shufersal price importer

Verified feed: https://prices.shufersal.co.il
See docs/supermarket-feeds.md

Examples:
  npx tsx --env-file=.env.local scripts/import-shufersal.ts --stores
  npx tsx --env-file=.env.local scripts/import-shufersal.ts --prices --store=357
`);
    return;
  }

  if (doStores) {
    const result = await importShufersalStores();
    console.log(result);
    if (!result.ok) process.exit(1);
  }

  if (doPrices) {
    if (!storeExternalId) {
      console.error("Missing --store=<externalId>");
      process.exit(1);
    }
    const result = await importShufersalStorePrices({ storeExternalId });
    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
