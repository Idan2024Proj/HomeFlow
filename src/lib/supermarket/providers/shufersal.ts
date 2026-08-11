import { gunzipSync } from "zlib";
import type { ImportedPriceItem, ImportedStore } from "../types";
import {
  decodeFeedBuffer,
  parsePriceFullXml,
  parseStoresXml,
} from "../parse-xml";

const PORTAL =
  "https://prices.shufersal.co.il/FileObject/UpdateCategory";

async function fetchListing(catID: number) {
  const url = `${PORTAL}?catID=${catID}&storeId=0&page=1&sort=Time&sortdir=DESC`;
  const res = await fetch(url, {
    headers: { "User-Agent": "HomeFlow-ShufersalImporter/1.0" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Shufersal listing failed (${res.status})`);
  return res.text();
}

function extractBlobLinks(html: string, kind: "Stores" | "PriceFull") {
  const re = new RegExp(
    `https?:\\\\/\\\\/[^"'\\s<>]+${kind}[^"'\\s<>]+\\.gz\\?[^"'\\s<>]+`,
    "gi",
  );
  // simpler: match azure blob urls containing kind
  const all = [
    ...html.matchAll(
      /https?:\/\/[^"'\s<>]+\.gz\?[^"'\s<>]+/gi,
    ),
  ].map((m) => m[0].replace(/&amp;/g, "&"));
  return all.filter((u) => u.toLowerCase().includes(kind.toLowerCase()));
}

async function downloadBinary(url: string): Promise<Buffer> {
  const res = await fetch(url, {
    headers: { "User-Agent": "HomeFlow-ShufersalImporter/1.0" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Download failed (${res.status}) for ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

function maybeGunzip(buf: Buffer): Buffer {
  if (buf.length >= 2 && buf[0] === 0x1f && buf[1] === 0x8b) {
    return gunzipSync(buf);
  }
  return buf;
}

export async function fetchShufersalStores(): Promise<{
  chainExternalId: string;
  chainName: string;
  stores: ImportedStore[];
  sourceFile: string;
}> {
  const html = await fetchListing(5);
  const links = extractBlobLinks(html, "Stores");
  if (!links[0]) throw new Error("No Shufersal Stores feed found");
  const buf = maybeGunzip(await downloadBinary(links[0]));
  const xml = decodeFeedBuffer(buf);
  const parsed = parseStoresXml(xml);
  return {
    ...parsed,
    chainName: parsed.chainName || "שופרסל",
    sourceFile: links[0].split("?")[0]?.split("/").pop() || "Stores",
  };
}

export async function fetchShufersalPriceFull(preferredStoreExternalId?: string): Promise<{
  chainExternalId: string;
  storeExternalId: string;
  items: ImportedPriceItem[];
  sourceFile: string;
}> {
  const html = await fetchListing(2);
  const links = extractBlobLinks(html, "PriceFull");
  if (!links.length) throw new Error("No Shufersal PriceFull feed found");

  let chosen = links[0];
  if (preferredStoreExternalId) {
    const match = links.find((u) =>
      u.includes(`-${preferredStoreExternalId}-`) ||
      u.includes(`-${preferredStoreExternalId.padStart(3, "0")}-`),
    );
    if (match) chosen = match;
  }

  const buf = maybeGunzip(await downloadBinary(chosen));
  const xml = decodeFeedBuffer(buf);
  const parsed = parsePriceFullXml(xml);
  if (parsed.items.length < 50) {
    throw new Error(
      `Suspicious PriceFull size (${parsed.items.length} items) — refusing to import`,
    );
  }
  return {
    ...parsed,
    sourceFile: chosen.split("?")[0]?.split("/").pop() || "PriceFull",
  };
}
