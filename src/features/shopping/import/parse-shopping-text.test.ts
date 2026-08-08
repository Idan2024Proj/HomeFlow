import { describe, expect, it } from "vitest";
import { parseShoppingText } from "./parse-shopping-text";
import { normalizeShoppingLine } from "./normalize-shopping-line";

describe("normalizeShoppingLine", () => {
  it("parses simple Hebrew line", () => {
    expect(normalizeShoppingLine("חלב")).toMatchObject({
      name: "חלב",
      quantity: 1,
    });
  });

  it("parses leading quantity", () => {
    expect(normalizeShoppingLine("2 חלב")).toMatchObject({
      name: "חלב",
      quantity: 2,
    });
  });

  it("parses x quantity forms", () => {
    expect(normalizeShoppingLine("חלב x2")).toMatchObject({
      name: "חלב",
      quantity: 2,
    });
    expect(normalizeShoppingLine("2x חלב")).toMatchObject({
      name: "חלב",
      quantity: 2,
    });
  });

  it("parses trailing integer quantity", () => {
    expect(normalizeShoppingLine("קולה זירו 3")).toMatchObject({
      name: "קולה זירו",
      quantity: 3,
    });
  });

  it("does not treat 3% as quantity", () => {
    expect(normalizeShoppingLine("חלב 3%")).toMatchObject({
      name: "חלב 3%",
      quantity: 1,
    });
  });

  it("does not treat 1.5 liter as quantity", () => {
    expect(normalizeShoppingLine("קולה 1.5 ליטר")).toMatchObject({
      name: "קולה 1.5 ליטר",
      quantity: 1,
    });
  });

  it("parses quantity with count unit", () => {
    expect(normalizeShoppingLine("ביצים 2 תבניות")).toMatchObject({
      name: "ביצים",
      quantity: 2,
      unit: "תבניות",
    });
  });

  it("strips bullets and numbers", () => {
    expect(normalizeShoppingLine("* חלב")).toMatchObject({ name: "חלב" });
    expect(normalizeShoppingLine("• ביצים")).toMatchObject({ name: "ביצים" });
    expect(normalizeShoppingLine("1. לחם")).toMatchObject({ name: "לחם" });
    expect(normalizeShoppingLine("2) קפה")).toMatchObject({ name: "קפה" });
  });
});

describe("parseShoppingText", () => {
  it("parses simple multiline Hebrew list", () => {
    const result = parseShoppingText("חלב\nביצים\nלחם");
    expect(result.items.map((i) => i.name)).toEqual(["חלב", "ביצים", "לחם"]);
  });

  it("parses bullets and numbered lines", () => {
    const text = `* חלב
• ביצים
1. לחם
2. קפה`;
    const result = parseShoppingText(text);
    expect(result.items.map((i) => i.name)).toEqual([
      "חלב",
      "ביצים",
      "לחם",
      "קפה",
    ]);
  });

  it("skips blank lines", () => {
    const result = parseShoppingText("חלב\n\n\nביצים\n");
    expect(result.items).toHaveLength(2);
    expect(result.skippedBlankLines).toBeGreaterThan(0);
  });

  it("merges clear duplicates and sums quantities", () => {
    const result = parseShoppingText("חלב\nחלב\n2 חלב");
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({ name: "חלב", quantity: 4 });
    expect(result.mergedCount).toBe(2);
  });

  it("does not merge similar but different products", () => {
    const result = parseShoppingText("חלב 1%\nחלב 3%\nקולה רגילה\nקולה זירו");
    expect(result.items).toHaveLength(4);
  });

  it("handles empty text", () => {
    const result = parseShoppingText("   \n\n");
    expect(result.items).toHaveLength(0);
  });

  it("handles quantities mixed with products", () => {
    const result = parseShoppingText("2 לחם אחיד\nקולה זירו 3");
    expect(result.items.find((i) => i.name === "לחם אחיד")?.quantity).toBe(2);
    expect(result.items.find((i) => i.name === "קולה זירו")?.quantity).toBe(3);
  });
});
