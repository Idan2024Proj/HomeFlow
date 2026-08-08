import { normalizeShoppingLine, normalizeShoppingName } from "./normalize-shopping-line";
import type { ParseShoppingTextResult, ParsedShoppingItem } from "./shopping-text-import.types";

/**
 * Parse a UTF-8 shopping list text into structured items.
 * Merges clearly identical normalized names by summing quantities.
 */
export function parseShoppingText(text: string): ParseShoppingTextResult {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/u);
  let skippedBlankLines = 0;
  const parsed: ParsedShoppingItem[] = [];

  for (const line of lines) {
    if (!line.trim()) {
      skippedBlankLines += 1;
      continue;
    }
    const item = normalizeShoppingLine(line);
    if (!item) {
      skippedBlankLines += 1;
      continue;
    }
    parsed.push(item);
  }

  const merged = new Map<
    string,
    ParsedShoppingItem & { _key: string }
  >();
  let mergedCount = 0;

  for (const item of parsed) {
    const key = normalizeShoppingName(item.name);
    const existing = merged.get(key);
    if (existing) {
      existing.quantity += item.quantity;
      // Prefer keeping a unit if one side has it
      if (!existing.unit && item.unit) existing.unit = item.unit;
      existing.rawText = `${existing.rawText} | ${item.rawText}`;
      mergedCount += 1;
    } else {
      merged.set(key, { ...item, _key: key });
    }
  }

  const items = [...merged.values()].map((entry) => {
    const { _key, ...rest } = entry;
    void _key;
    return rest;
  });

  return {
    items,
    mergedCount,
    skippedBlankLines,
  };
}
