import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/supabase/auth";
import { analyzeReceiptWithGemini } from "@/lib/receipts/gemini";
import { buildReceiptWarnings } from "@/lib/receipts/schema";

export const runtime = "nodejs";
export const maxDuration = 60;

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "יש להתחבר" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { ok: false, message: "לא התקבלה תמונה תקינה" },
      { status: 400 },
    );
  }

  const file = formData.get("image");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { ok: false, message: "נא להעלות תמונת קבלה" },
      { status: 400 },
    );
  }

  if (file.size <= 0 || file.size > MAX_BYTES) {
    return NextResponse.json(
      { ok: false, message: "גודל התמונה חייב להיות עד 8MB" },
      { status: 400 },
    );
  }

  const mimeType = file.type || "image/jpeg";
  if (!ALLOWED_TYPES.has(mimeType) && !mimeType.startsWith("image/")) {
    return NextResponse.json(
      { ok: false, message: "סוג הקובץ אינו נתמך. השתמשו ב־JPG / PNG / WEBP" },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString("base64");

  const result = await analyzeReceiptWithGemini({
    mimeType,
    base64,
  });

  if (!result.ok) {
    const status = result.code === "NO_API_KEY" ? 503 : 422;
    return NextResponse.json(
      {
        ok: false,
        code: result.code,
        message: result.message,
        beta: true,
      },
      { status },
    );
  }

  return NextResponse.json({
    ok: true,
    beta: true,
    data: result.data,
    warnings: buildReceiptWarnings(result.data),
  });
}
