/** Collapse whitespace and lowercase for duplicate detection. */
export function normalizeShoppingName(name: string): string {
  return name
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

const LIST_PREFIX =
  /^(?:[\u2022\u25CF\u25E6*\-\u2013\u2014]+|\d{1,3}[.)]\s*|\(\d{1,3}\)\s*)\s*/u;

/** Strip bullets / numbered list markers from a line. */
export function stripListPrefix(line: string): string {
  let value = line.trim();
  // Repeatedly strip common prefixes (e.g. "* 1. milk")
  for (let i = 0; i < 3; i += 1) {
    const next = value.replace(LIST_PREFIX, "").trim();
    if (next === value) break;
    value = next;
  }
  return value;
}

const SIZE_UNITS =
  /^(?:ליטר|ל'|ל׳|מל|מ״ל|מ"ל|קג|ק״ג|ק"ג|גרם|גר'|ג'|סמ|ס״מ|יח'|יחידה)$/u;

const COUNT_UNITS =
  /^(?:תבניות|תבנית|יחידות|יח'|יח|חבילות|חבילה|שקית|שקיות|בקבוקים|בקבוק|קופסאות|קופסה)$/u;

function isSizeContext(tokenAfterNumber: string | undefined): boolean {
  if (!tokenAfterNumber) return false;
  const t = tokenAfterNumber.replace(/[.,]$/u, "");
  if (t.startsWith("%")) return true;
  return SIZE_UNITS.test(t);
}

function isCountUnit(token: string | undefined): boolean {
  if (!token) return false;
  return COUNT_UNITS.test(token.replace(/[.,]$/u, ""));
}

/**
 * Parse a single shopping line into name + quantity.
 * Prefers not inventing quantity from product sizes (3%, 1.5 ליטר).
 */
export function normalizeShoppingLine(rawLine: string): {
  rawText: string;
  name: string;
  quantity: number;
  unit: string | null;
  notes: string | null;
} | null {
  const rawText = rawLine.trim();
  if (!rawText) return null;

  const line = stripListPrefix(rawText);
  if (!line) return null;

  let quantity = 1;
  let unit: string | null = null;
  let name = line;

  // 2x חלב | 2×חלב | 2 x חלב
  const leadingMultiplier = line.match(
    /^(\d+(?:[.,]\d+)?)\s*[xX×]\s*(.+)$/u,
  );
  if (leadingMultiplier) {
    quantity = Number(leadingMultiplier[1].replace(",", "."));
    name = leadingMultiplier[2].trim();
  } else {
    // חלב x2 | חלב × 2
    const trailingMultiplier = line.match(
      /^(.+?)\s*[xX×]\s*(\d+(?:[.,]\d+)?)$/u,
    );
    if (trailingMultiplier) {
      name = trailingMultiplier[1].trim();
      quantity = Number(trailingMultiplier[2].replace(",", "."));
    } else {
      const tokens = line.split(/\s+/u);
      const first = tokens[0];
      const firstNum = first?.match(/^(\d+(?:[.,]\d+)?)$/u);

      // Leading integer/decimal quantity: "2 חלב" / "3 קולה זירו"
      // but not "1.5 ליטר קולה" where next token is a size unit with no product after? 
      // "2 תבניות ביצים" → qty 2 unit תבניות name ביצים
      if (firstNum && tokens.length >= 2) {
        const num = Number(firstNum[1].replace(",", "."));
        const second = tokens[1];
        if (isCountUnit(second) && tokens.length >= 3) {
          quantity = num;
          unit = second.replace(/[.,]$/u, "");
          name = tokens.slice(2).join(" ").trim();
        } else if (!isSizeContext(second)) {
          quantity = num;
          name = tokens.slice(1).join(" ").trim();
        }
      } else {
        // Trailing: "ביצים 2 תבניות" | "קולה זירו 3" | avoid "חלב 3%" | "קולה 1.5 ליטר"
        const last = tokens[tokens.length - 1];
        const secondLast = tokens[tokens.length - 2];
        const lastNum = last?.match(/^(\d+(?:[.,]\d+)?)$/u);
        const secondLastNum = secondLast?.match(/^(\d+(?:[.,]\d+)?)$/u);

        if (secondLastNum && isCountUnit(last) && tokens.length >= 3) {
          quantity = Number(secondLastNum[1].replace(",", "."));
          unit = last.replace(/[.,]$/u, "");
          name = tokens.slice(0, -2).join(" ").trim();
        } else if (lastNum && tokens.length >= 2) {
          const num = Number(lastNum[1].replace(",", "."));
          // "חלב 3%" already one token sometimes — handle percent glued
          if (last.includes("%")) {
            // keep whole line as name
          } else if (Number.isInteger(num) && num > 0 && num < 1000) {
            // Bare trailing integer → quantity (חלב 2, קולה זירו 3)
            quantity = num;
            name = tokens.slice(0, -1).join(" ").trim();
          }
          // Decimal trailing alone without unit → keep as name (ambiguous size)
        } else if (
          tokens.length >= 3 &&
          secondLastNum &&
          isSizeContext(last)
        ) {
          // "קולה 1.5 ליטר" — keep full name
          name = line;
        }
      }
    }
  }

  // Glued percent: ensure "חלב 3%" wasn't split — if name empty, fallback
  name = name.replace(/\s+/g, " ").trim();
  if (!name) {
    name = stripListPrefix(rawText);
    quantity = 1;
    unit = null;
  }

  // Safety: "חלב 3%" as whole line must stay
  if (/%/.test(rawText) && !/^\d+\s+/.test(stripListPrefix(rawText))) {
    // If we accidentally stripped a trailing integer before %, restore
    if (!name.includes("%") && rawText.includes("%")) {
      name = stripListPrefix(rawText);
      quantity = 1;
      unit = null;
    }
  }

  if (!Number.isFinite(quantity) || quantity <= 0) quantity = 1;

  return {
    rawText,
    name,
    quantity,
    unit,
    notes: null,
  };
}
