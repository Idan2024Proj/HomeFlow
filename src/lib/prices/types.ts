export type ImportedStore = {
  chainExternalId: string;
  subChainExternalId?: string | null;
  storeExternalId: string;
  name: string | null;
  address: string | null;
  city: string | null;
};

export type ImportedPriceItem = {
  chainExternalId: string;
  storeExternalId: string;
  productCode: string;
  barcode: string | null;
  name: string;
  manufacturer: string | null;
  manufacturerItemDescription: string | null;
  unitOfMeasure: string | null;
  quantity: number | null;
  price: number;
  unitPrice: number | null;
  allowDiscount: boolean | null;
  sourceUpdatedAt: Date | null;
};

export type ImportedPromotion = {
  externalPromotionId: string;
  chainExternalId: string;
  storeExternalId: string | null;
  description: string | null;
  startAt: Date | null;
  endAt: Date | null;
  minQuantity: number | null;
  promotionalPrice: number | null;
  clubOnly: boolean;
  productCodes: string[];
};

export type FeedFileKind = "stores" | "priceFull" | "price" | "promoFull" | "promo";

export type ListedFeedFile = {
  kind: FeedFileKind;
  fileName: string;
  storeExternalId: string | null;
  downloadUrl: string;
  updatedAt: string | null;
  sizeLabel: string | null;
};

export type PriceProvider = {
  id: string;
  displayName: string;
  listFiles(kind: FeedFileKind, options?: { storeExternalId?: string }): Promise<ListedFeedFile[]>;
  downloadAndDecompress(url: string): Promise<string>;
  parseStoresXml(xml: string): ImportedStore[];
  parsePricesXml(xml: string): ImportedPriceItem[];
};
