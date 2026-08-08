import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/supabase/auth";
import { searchProductPrices } from "@/lib/supermarket/search";

export async function GET(request: Request) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "יש להתחבר" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();
  if (!q) {
    return NextResponse.json({ ok: false, message: "נא להזין מילת חיפוש" }, { status: 400 });
  }

  const result = await searchProductPrices(q);
  return NextResponse.json({
    ok: true,
    query: q,
    source: result.source,
    count: result.hits.length,
    hits: result.hits,
  });
}
