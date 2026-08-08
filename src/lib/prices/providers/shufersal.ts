import { XMLParser } from "fast-xml-parser";
import { gunzipSync } from "zlib";
import {
  isReasonablePrice,
  parseMaybeDate,
  parseMaybeNumber,
} from "@/lib/prices/normalize";
import type {
  FeedFileKind,
  ImportedPriceItem,
  ImportedStore,
  ListedFeedFile,
  PriceProvider,
} from "@/lib/prices/types";

const BASE = "https://prices.shufersal.co.il";
const CHAIN_ID = "7290027600007";

/** Verified category IDs on prices.shufersal.co.il (2026-08). */
const CAT_IDS: Record<FeedFileKind, number> = {
  stores: 5,
  priceFull: 2,
  price: 1,
  promoFull: 4,
  promo: 3,
};

const parser = new XMLParser({
  ignoreAttributes: false,
  trimValues: true,
  isArray: (name) =>
    ["Store", "Item", "SubChain", "Promotion", "PromotionItem"].includes(name),
});

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function text(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "object" && value !== null && "#text" in value) {
    return text((value as { "#text": unknown })["#text"]);
  }
  const s = String(value).trim();
  return s ? s : null;
}

function extractFilesFromHtml(html: string, kind: FeedFileKind): ListedFeedFile[] {
  const rows: ListedFeedFile[] = [];
  // Each table row roughly: download link + metadata cells + filename
  const rowRe =
    /href="(https:\/\/pricesprodpublic\.blob\.core\.windows\.net[^"]+)"[^>]*>\s*לחץ להורדה[\s\S]*?<\/td>\s*<td[^>]*>([^<]*)<\/td>\s*<td[^>]*>([^<]*)<\/td>\s*<td[^>]*>([^<]*)<\/td>\s*<td[^>]*>([^<]*)<\/td>\s*<td[^>]*>([^<]*)<\/td>\s*<td[^>]*>([^<]*)<\/td>/gi;

  let m: RegExpExecArray | null;
  while ((m = rowRe.exec(html))) {
    const downloadUrl = m[1].replace(/&amp;/g, "&");
    const updatedAt = m[2]?.trim() || null;
    const sizeLabel = m[3]?.trim() || null;
    const fileName = m[7]?.trim() || "";
    const storeMatch = fileName.match(/-(\d{3})-\d{8}/);
    rows.push({
      kind,
      fileName,
      storeExternalId: storeMatch ? String(Number(storeMatch[1])) : null,
      downloadUrl,
      updatedAt,
      sizeLabel,
    });
  }

  if (rows.length === 0) {
    // Fallback: links only
    const linkRe =
      /href="(https:\/\/pricesprodpublic\.blob\.core\.windows\.net[^"]+\.gz\?[^"]*)"/gi;
    while ((m = linkRe.exec(html))) {
      const downloadUrl = m[1].replace(/&amp;/g, "&");
      const fileName = decodeURIComponent(
        downloadUrl.split("/").pop()?.split("?")[0] || "",
      );
      const storeMatch = fileName.match(/-(\d{3})-\d{8}/);
      rows.push({
        kind,
        fileName,
        storeExternalId: storeMatch ? String(Number(storeMatch[1])) : null,
        downloadUrl,
        updatedAt: null,
        sizeLabel: null,
      });
    }
  }

  return rows;
}

export const shufersalProvider: PriceProvider = {
  id: "shufersal",
  displayName: "שופרסל",

  async listFiles(kind, options = {}) {
    const catID = CAT_IDS[kind];
    const storeId = options.storeExternalId
      ? String(Number(options.storeExternalId)).padStart(3, "0")
      : "0";
    // API expects numeric store filter; 0 = all
    const filterStore = options.storeExternalId
      ? String(Number(options.storeExternalId))
      : "0";
    const url = `${BASE}/FileObject/UpdateCategory?catID=${catID}&storeId=${filterStore}&sort=Time&sortdir=DESC&page=1`;
    const res = await fetch(url, {
      headers: { "User-Agent": "HomeFlowPriceImporter/1.0" },
    });
    if (!res.ok) {
      throw new Error(`Shufersal list failed (${res.status}) for ${kind}`);
    }
    const html = await res.text();
    let files = extractFilesFromHtml(html, kind);
    if (options.storeExternalId) {
      const wanted = String(Number(options.storeExternalId));
      const padded = wanted.padStart(3, "0");
      files = files.filter(
        (f) =>
          f.storeExternalId === wanted ||
          f.fileName.includes(`-${padded}-`) ||
          f.fileName.includes(`-${wanted}-`),
      );
    }
    void storeId;
    return files;
  },

  async downloadAndDecompress(url) {
    const res = await fetch(url, {
      headers: { "User-Agent": "HomeFlowPriceImporter/1.0" },
    });
    if (!res.ok) throw new Error(`Download failed (${res.status})`);
    const buf = Buffer.from(await res.arrayBuffer());
    const xmlBuf = url.includes(".gz") || buf[0] === 0x1f ? gunzipSync(buf) : buf;
    return xmlBuf.toString("utf8");
  },

  parseStoresXml(xml) {
    const doc = parser.parse(xml);
    const chain = doc.Chain ?? doc.Root ?? doc;
    const chainExternalId = text(chain.ChainID) || CHAIN_ID;
    const stores: ImportedStore[] = [];

    for (const sub of asArray(chain.SubChains?.SubChain)) {
      const subId = text(sub.SubChainID);
      for (const store of asArray(sub.Stores?.Store)) {
        const storeExternalId = text(store.StoreID);
        if (!storeExternalId) continue;
        stores.push({
          chainExternalId,
          subChainExternalId: subId,
          storeExternalId: String(Number(storeExternalId)),
          name: text(store.StoreName),
          address: text(store.Address),
          city: text(store.City),
        });
      }
    }
    return stores;
  },

  parsePricesXml(xml) {
    const doc = parser.parse(xml);
    const root = doc.Root ?? doc.Chain ?? doc;
    const chainExternalId = text(root.ChainID) || CHAIN_ID;
    const storeExternalId = text(root.StoreID);
    if (!storeExternalId) return [];

    const items: ImportedPriceItem[] = [];
    for (const item of asArray(root.Items?.Item)) {
      const productCode = text(item.ItemCode);
      const name = text(item.ItemName);
      const price = parseMaybeNumber(item.ItemPrice);
      if (!productCode || !name || price == null || !isReasonablePrice(price)) {
        continue;
      }
      items.push({
        chainExternalId,
        storeExternalId: String(Number(storeExternalId)),
        productCode,
        barcode: productCode.length >= 8 ? productCode : null,
        name,
        manufacturer: text(item.ManufactureName),
        manufacturerItemDescription: text(item.ManufactureItemDescription),
        unitOfMeasure: text(item.UnitOfMeasure) || text(item.UnitQty),
        quantity: parseMaybeNumber(item.Quantity),
        price,
        unitPrice: parseMaybeNumber(item.UnitOfMeasurePrice),
        allowDiscount:
          text(item.AllowDiscount) == null
            ? null
            : text(item.AllowDiscount) === "1" ||
              text(item.AllowDiscount)?.toLowerCase() === "true",
        sourceUpdatedAt: parseMaybeDate(item.PriceUpdateTime),
      });
    }
    return items;
  },
};

export const SHUFERSAL_CHAIN_EXTERNAL_ID = CHAIN_ID;
