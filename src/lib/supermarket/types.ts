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

export type PriceSearchHit = {
  productCode: string;
  name: string;
  price: number;
  storeName: string | null;
  storeCity: string | null;
  chainName: string;
  sourceUpdatedAt: string | null;
};
