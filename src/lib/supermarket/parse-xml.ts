import { XMLParser } from "fast-xml-parser";
import type { ImportedPriceItem, ImportedStore } from "./types";

function asArray<T>(value: T | T[] | null | undefined): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function text(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string" || typeof value === "number") {
    const s = String(value).trim();
    return s.length ? s : null;
  }
  if (typeof value === "object" && value && "#text" in value) {
    return text((value as { "#text": unknown })["#text"]);
  }
  return null;
}

function num(value: unknown): number | null {
  const s = text(value);
  if (!s) return null;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function bool(value: unknown): boolean | null {
  const s = text(value);
  if (s == null) return null;
  if (s === "1" || s.toLowerCase() === "true") return true;
  if (s === "0" || s.toLowerCase() === "false") return false;
  return null;
}

function parseDate(value: unknown): Date | null {
  const s = text(value);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  trimValues: true,
  isArray: (name) =>
    ["Item", "Store", "SubChain", "Promotion", "PromotionItem"].includes(name),
});

export function decodeFeedBuffer(buf: Buffer): string {
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
    return buf.toString("utf16le");
  }
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    return buf.toString("utf8");
  }
  // UTF-16 without BOM heuristic
  if (buf.length >= 4 && buf[1] === 0x00 && buf[3] === 0x00) {
    return buf.toString("utf16le");
  }
  return buf.toString("utf8");
}

export function normalizeProductName(name: string): string {
  return name.normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();
}

export function parseStoresXml(xml: string): {
  chainExternalId: string;
  chainName: string;
  stores: ImportedStore[];
} {
  const doc = parser.parse(xml);
  const root = doc.Root ?? doc.root ?? doc;
  const chainExternalId = text(root.ChainID ?? root.ChainId) ?? "";
  const chainName = text(root.ChainName) ?? chainExternalId;
  const stores: ImportedStore[] = [];

  for (const sub of asArray(root.SubChains?.SubChain)) {
    const subId = text(sub.SubChainID ?? sub.SubChainId);
    for (const store of asArray(sub.Stores?.Store)) {
      const storeExternalId = text(store.StoreID ?? store.StoreId);
      if (!chainExternalId || !storeExternalId) continue;
      stores.push({
        chainExternalId,
        subChainExternalId: subId,
        storeExternalId,
        name: text(store.StoreName),
        address: text(store.Address),
        city: text(store.City),
      });
    }
  }

  return { chainExternalId, chainName, stores };
}

export function parsePriceFullXml(xml: string): {
  chainExternalId: string;
  storeExternalId: string;
  items: ImportedPriceItem[];
} {
  const doc = parser.parse(xml);
  const root = doc.Root ?? doc.root ?? doc;
  const chainExternalId = text(root.ChainID ?? root.ChainId) ?? "";
  const storeExternalId = text(root.StoreID ?? root.StoreId) ?? "";
  const items: ImportedPriceItem[] = [];

  for (const item of asArray(root.Items?.Item)) {
    const productCode = text(item.ItemCode);
    const name = text(item.ItemName);
    const price = num(item.ItemPrice);
    if (!productCode || !name || price == null || price <= 0 || price > 100_000) {
      continue;
    }
    items.push({
      chainExternalId,
      storeExternalId,
      productCode,
      barcode: text(item.ItemCode),
      name,
      manufacturer: text(item.ManufacturerName),
      manufacturerItemDescription: text(item.ManufacturerItemDescription),
      unitOfMeasure: text(item.UnitOfMeasure ?? item.UnitQty),
      quantity: num(item.Quantity),
      price,
      unitPrice: num(item.UnitOfMeasurePrice ?? item.UnitPrice),
      allowDiscount: bool(item.AllowDiscount),
      sourceUpdatedAt: parseDate(item.PriceUpdateDate ?? item.PriceUpdateTime),
    });
  }

  return { chainExternalId, storeExternalId, items };
}
