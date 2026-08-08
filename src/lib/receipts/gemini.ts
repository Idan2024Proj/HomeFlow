import {
  GoogleGenerativeAI,
  SchemaType,
  type ResponseSchema,
} from "@google/generative-ai";
import { parsedReceiptSchema, type ParsedReceipt } from "@/lib/receipts/schema";

const RECEIPT_SCHEMA: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    merchant: {
      type: SchemaType.STRING,
      nullable: true,
      description: "Merchant / store name as printed on the receipt",
    },
    date: {
      type: SchemaType.STRING,
      nullable: true,
      description: "Purchase date in YYYY-MM-DD if clearly visible",
    },
    total: {
      type: SchemaType.NUMBER,
      nullable: true,
      description: "Grand total amount as a non-negative number",
    },
    currency: {
      type: SchemaType.STRING,
      format: "enum",
      enum: ["ILS", "USD", "EUR"],
      nullable: true,
      description: "Currency code if identifiable (₪ = ILS)",
    },
    items: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING },
          quantity: { type: SchemaType.NUMBER, nullable: true },
          unitPrice: { type: SchemaType.NUMBER, nullable: true },
          totalPrice: { type: SchemaType.NUMBER, nullable: true },
        },
        required: ["name", "quantity", "unitPrice", "totalPrice"],
      },
    },
  },
  required: ["merchant", "date", "total", "currency", "items"],
};

const SYSTEM_PROMPT = `You extract structured data from Israeli / Hebrew retail receipts.
Rules:
- Never invent values that are not clearly visible.
- If a field is unclear, return null.
- Do not guess missing prices or quantities.
- Keep product names as close as possible to the receipt text.
- Exclude non-product lines (cashier number, transaction id, card digits, VAT labels as standalone rows).
- Discounts / refunds may appear as product-like rows with their printed names; use prices as shown.
- Prefer ILS when ₪ or ש״ח appears.
- Date must be YYYY-MM-DD when known.`;

export type AnalyzeReceiptResult =
  | { ok: true; data: ParsedReceipt }
  | { ok: false; code: "NO_API_KEY" | "PARSE_FAILED" | "MODEL_ERROR"; message: string };

export async function analyzeReceiptWithGemini(params: {
  mimeType: string;
  base64: string;
}): Promise<AnalyzeReceiptResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return {
      ok: false,
      code: "NO_API_KEY",
      message:
        "סריקת קבלות ב־Beta — עדיין לא הוגדר מפתח Gemini בשרת. אפשר למלא את הפרטים ידנית.",
    };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash",
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema: RECEIPT_SCHEMA,
      },
    });

    const result = await model.generateContent([
      { text: SYSTEM_PROMPT },
      {
        inlineData: {
          mimeType: params.mimeType,
          data: params.base64,
        },
      },
      {
        text: "Extract the receipt fields into the JSON schema. Reply with JSON only.",
      },
    ]);

    const text = result.response.text();
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      return {
        ok: false,
        code: "PARSE_FAILED",
        message: "לא הצלחנו לקרוא את תשובת הסריקה. נסו שוב או מלאו ידנית.",
      };
    }

    const validated = parsedReceiptSchema.safeParse(raw);
    if (!validated.success) {
      return {
        ok: false,
        code: "PARSE_FAILED",
        message: "הנתונים מהסריקה לא תקינים. אפשר להזין ידנית.",
      };
    }

    return { ok: true, data: validated.data };
  } catch (error) {
    const message = error instanceof Error ? error.message : "שגיאה לא ידועה";
    return {
      ok: false,
      code: "MODEL_ERROR",
      message: `סריקת הקבלה נכשלה (${message}). נסו שוב או מלאו ידנית.`,
    };
  }
}
