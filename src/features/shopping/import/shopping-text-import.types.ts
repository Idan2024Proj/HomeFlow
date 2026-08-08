export type ParsedShoppingItem = {
  rawText: string;
  name: string;
  quantity: number;
  unit: string | null;
  notes: string | null;
};

export type ShoppingTextImportPreviewItem = ParsedShoppingItem & {
  id: string;
};

export type ParseShoppingTextResult = {
  items: ParsedShoppingItem[];
  mergedCount: number;
  skippedBlankLines: number;
};
