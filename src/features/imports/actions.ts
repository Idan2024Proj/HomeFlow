"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAuthUser, getMembershipContext } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import type { ParsedImportRow } from "@/lib/import";
import { computeSplits } from "@/lib/finance";

export type ActionResult = { ok: boolean; message?: string; imported?: number };

// Server-side validation — the payload arrives from the client and must not be trusted
const importPayloadSchema = z.object({
  sourceName: z.string().trim().min(1).max(120),
  fileType: z.enum(["csv", "xlsx"]),
  mapping: z.record(z.string(), z.string().max(200)),
  rows: z
    .array(
      z.object({
        status: z.enum(["new", "duplicate", "invalid", "imported"]),
        type: z.enum(["expense", "income"]),
        amount: z.number().finite().positive().max(10_000_000),
        occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        merchantName: z.string().trim().min(1).max(200),
        lastFour: z.string().max(20).optional(),
        note: z.string().max(500).nullish(),
        fingerprint: z.string().max(200),
        raw: z.record(z.string(), z.unknown()),
      }),
    )
    .max(2000),
});

export async function commitImportAction(payload: {
  sourceName: string;
  fileType: "csv" | "xlsx";
  mapping: Record<string, string>;
  rows: ParsedImportRow[];
}): Promise<ActionResult> {
  const user = await getAuthUser();
  const context = await getMembershipContext();
  if (!user || !context) return { ok: false, message: "יש להתחבר" };

  const validated = importPayloadSchema.safeParse(payload);
  if (!validated.success) {
    return { ok: false, message: "קובץ הייבוא מכיל נתונים לא תקינים" };
  }
  payload = validated.data as typeof payload;

  const toImport = payload.rows.filter((r) => r.status === "new");
  if (toImport.length === 0) {
    return { ok: false, message: "אין שורות חדשות לייבוא" };
  }

  const supabase = await createClient();
  const { data: batch, error: batchError } = await supabase
    .from("import_batches")
    .insert({
      household_id: context.household.id,
      source_name: payload.sourceName,
      file_type: payload.fileType,
      column_mapping: payload.mapping,
      status: "committed",
      row_count: toImport.length,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (batchError) return { ok: false, message: batchError.message };

  let imported = 0;
  for (const row of toImport) {
    const { data: tx, error } = await supabase
      .from("transactions")
      .insert({
        household_id: context.household.id,
        type: row.type,
        amount: row.amount,
        occurred_on: row.occurredOn,
        merchant_name: row.merchantName,
        paid_by: user.id,
        split_mode: "personal",
        is_shared: false,
        note: row.note ?? null,
        status: "confirmed",
        created_by: user.id,
        import_batch_id: batch.id,
        external_fingerprint: row.fingerprint,
      })
      .select("id")
      .single();

    if (error) continue;

    const splits = computeSplits({
      amount: row.amount,
      mode: "personal",
      paidBy: user.id,
      participantIds: [user.id],
    });
    await supabase.from("transaction_splits").insert(
      splits.map((s) => ({
        household_id: context.household.id,
        transaction_id: tx.id,
        user_id: s.userId,
        share_amount: s.shareAmount,
        share_percent: s.sharePercent,
      })),
    );

    await supabase.from("imported_rows").insert({
      household_id: context.household.id,
      batch_id: batch.id,
      raw: row.raw,
      parsed: row,
      fingerprint: row.fingerprint,
      status: "imported",
      transaction_id: tx.id,
    });
    imported += 1;
  }

  revalidatePath("/transactions");
  revalidatePath("/");
  revalidatePath("/import");
  return { ok: true, message: `יובאו ${imported} עסקאות`, imported };
}
