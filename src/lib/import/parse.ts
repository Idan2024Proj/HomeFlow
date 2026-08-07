import * as XLSX from "xlsx";
import { fingerprintImportRow, normalizeMerchantName } from "@/lib/finance";

export type ImportColumnKey =
  | "occurredOn"
  | "chargedOn"
  | "merchantName"
  | "amount"
  | "currency"
  | "installments"
  | "installmentNumber"
  | "type"
  | "lastFour"
  | "note";

export type ParsedImportRow = {
  occurredOn: string;
  merchantName: string;
  amount: number;
  type: "expense" | "income";
  lastFour?: string;
  note?: string;
  fingerprint: string;
  status: "new" | "duplicate" | "invalid";
  raw: Record<string, unknown>;
};

const HEADER_ALIASES: Record<ImportColumnKey, string[]> = {
  occurredOn: ["תאריך עסקה", "תאריך", "date", "transaction date", "עסקה"],
  chargedOn: ["תאריך חיוב", "חיוב", "charge date"],
  merchantName: ["בית עסק", "שם בית עסק", "תיאור", "merchant", "description"],
  amount: ["סכום", "amount", "חיוב בשח", "סכום חיוב"],
  currency: ["מטבע", "currency"],
  installments: ["מספר תשלומים", "תשלומים", "installments"],
  installmentNumber: ["מספר תשלום", "תשלום"],
  type: ["סוג עסקה", "סוג", "type"],
  lastFour: ["4 ספרות", "ארבע ספרות", "last four", "card"],
  note: ["הערות", "הערה", "notes", "note"],
};

function normalizeHeader(value: string) {
  return value.trim().toLowerCase();
}

export function autoMapColumns(headers: string[]): Partial<Record<ImportColumnKey, string>> {
  const mapping: Partial<Record<ImportColumnKey, string>> = {};
  for (const [key, aliases] of Object.entries(HEADER_ALIASES) as Array<
    [ImportColumnKey, string[]]
  >) {
    const found = headers.find((h) =>
      aliases.some((a) => normalizeHeader(h).includes(normalizeHeader(a))),
    );
    if (found) mapping[key] = found;
  }
  return mapping;
}

function parseAmount(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/[^\d.,\-]/g, "").replace(",", ".");
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

function parseDate(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return null;
    const mm = String(parsed.m).padStart(2, "0");
    const dd = String(parsed.d).padStart(2, "0");
    return `${parsed.y}-${mm}-${dd}`;
  }
  if (typeof value === "string") {
    const v = value.trim();
    const he = v.match(/^(\d{1,2})[./](\d{1,2})[./](\d{2,4})$/);
    if (he) {
      const year = he[3].length === 2 ? `20${he[3]}` : he[3];
      return `${year}-${he[2].padStart(2, "0")}-${he[1].padStart(2, "0")}`;
    }
    if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  }
  return null;
}

export function parseWorkbook(buffer: ArrayBuffer) {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: true,
  });
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  return { sheetName, headers, rows };
}

export function mapRows(input: {
  rows: Array<Record<string, unknown>>;
  mapping: Partial<Record<ImportColumnKey, string>>;
  existingFingerprints: Set<string>;
}): ParsedImportRow[] {
  return input.rows.map((raw) => {
    const occurredOn = parseDate(raw[input.mapping.occurredOn ?? ""]);
    const merchantName = String(raw[input.mapping.merchantName ?? ""] ?? "").trim();
    let amount = parseAmount(raw[input.mapping.amount ?? ""]);
    const typeHint = String(raw[input.mapping.type ?? ""] ?? "").toLowerCase();
    let type: "expense" | "income" = "expense";

    if (amount != null && amount < 0) {
      amount = Math.abs(amount);
      type = "income";
    }
    if (typeHint.includes("זיכוי") || typeHint.includes("credit") || typeHint.includes("income")) {
      type = "income";
    }

    if (!occurredOn || !merchantName || amount == null || amount <= 0) {
      return {
        occurredOn: occurredOn ?? "",
        merchantName,
        amount: amount ?? 0,
        type,
        fingerprint: "",
        status: "invalid" as const,
        raw,
      };
    }

    const lastFour = String(raw[input.mapping.lastFour ?? ""] ?? "")
      .replace(/\D/g, "")
      .slice(-4);
    const fingerprint = fingerprintImportRow({
      occurredOn,
      amount,
      merchantName: normalizeMerchantName(merchantName),
      lastFour: lastFour || undefined,
    });

    return {
      occurredOn,
      merchantName,
      amount,
      type,
      lastFour: lastFour || undefined,
      note: String(raw[input.mapping.note ?? ""] ?? "") || undefined,
      fingerprint,
      status: input.existingFingerprints.has(fingerprint) ? "duplicate" : "new",
      raw,
    };
  });
}
