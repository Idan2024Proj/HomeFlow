"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  autoMapColumns,
  mapRows,
  parseWorkbook,
  type ImportColumnKey,
  type ParsedImportRow,
} from "@/lib/import";
import { commitImportAction } from "@/features/imports/actions";
import { formatMoney } from "@/lib/utils/money";

const FIELD_LABELS: Record<ImportColumnKey, string> = {
  occurredOn: "תאריך עסקה",
  chargedOn: "תאריך חיוב",
  merchantName: "בית עסק",
  amount: "סכום",
  currency: "מטבע",
  installments: "מספר תשלומים",
  installmentNumber: "מספר תשלום",
  type: "סוג",
  lastFour: "4 ספרות",
  note: "הערות",
};

export function ImportWizard({
  existingFingerprints,
}: {
  existingFingerprints: string[];
}) {
  const [step, setStep] = useState(1);
  const [fileName, setFileName] = useState("");
  const [fileType, setFileType] = useState<"csv" | "xlsx">("csv");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Array<Record<string, unknown>>>([]);
  const [mapping, setMapping] = useState<Partial<Record<ImportColumnKey, string>>>({});
  const [parsed, setParsed] = useState<ParsedImportRow[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const fingerprintSet = useMemo(
    () => new Set(existingFingerprints),
    [existingFingerprints],
  );

  const stats = useMemo(() => {
    const total = parsed.length;
    const duplicates = parsed.filter((r) => r.status === "duplicate").length;
    const invalid = parsed.filter((r) => r.status === "invalid").length;
    const ready = parsed.filter((r) => r.status === "new").length;
    const sum = parsed
      .filter((r) => r.status === "new")
      .reduce((s, r) => s + r.amount, 0);
    return { total, duplicates, invalid, ready, sum };
  }, [parsed]);

  async function onFile(file: File) {
    setMessage(null);
    setFileName(file.name);
    setFileType(file.name.toLowerCase().endsWith(".csv") ? "csv" : "xlsx");
    const buffer = await file.arrayBuffer();
    const { headers: cols, rows } = parseWorkbook(buffer);
    setHeaders(cols);
    setRawRows(rows);
    setMapping(autoMapColumns(cols));
    setStep(2);
  }

  function preview() {
    const rows = mapRows({
      rows: rawRows,
      mapping,
      existingFingerprints: fingerprintSet,
    });
    setParsed(rows);
    setStep(3);
  }

  function commit() {
    startTransition(async () => {
      const result = await commitImportAction({
        sourceName: fileName,
        fileType,
        mapping: mapping as Record<string, string>,
        rows: parsed,
      });
      setMessage(result.message ?? null);
      if (result.ok) setStep(4);
    });
  }

  return (
    <div className="space-y-6">
      <ol className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        {["העלאה", "מיפוי", "בדיקה", "אישור"].map((label, idx) => (
          <li
            key={label}
            className={`rounded-lg border px-3 py-1 ${step === idx + 1 ? "border-primary text-foreground" : "border-border"}`}
          >
            {idx + 1}. {label}
          </li>
        ))}
      </ol>

      {step === 1 ? (
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border px-6 py-16 text-center">
          <span className="font-medium">גררו קובץ או לחצו לבחירה</span>
          <span className="text-sm text-muted-foreground">CSV / Excel · עד 5MB מומלץ</span>
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void onFile(file);
            }}
          />
        </label>
      ) : null}

      {step === 2 ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">קובץ: {fileName}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {(Object.keys(FIELD_LABELS) as ImportColumnKey[]).map((key) => (
              <label key={key} className="space-y-1 text-sm">
                <span>{FIELD_LABELS[key]}</span>
                <select
                  className="h-8 w-full rounded-lg border border-input px-2.5"
                  value={mapping[key] ?? ""}
                  onChange={(e) =>
                    setMapping((prev) => ({ ...prev, [key]: e.target.value || undefined }))
                  }
                >
                  <option value="">—</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <Button type="button" onClick={preview}>
            המשך לבדיקה
          </Button>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-4 text-sm">
            <div className="rounded-xl border border-border p-3">נמצאו: {stats.total}</div>
            <div className="rounded-xl border border-border p-3">חדשות: {stats.ready}</div>
            <div className="rounded-xl border border-border p-3">כפולות: {stats.duplicates}</div>
            <div className="rounded-xl border border-border p-3">
              סכום: {formatMoney(stats.sum)}
            </div>
          </div>
          <div className="max-h-80 overflow-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60">
                <tr>
                  <th className="px-3 py-2 text-right">תאריך</th>
                  <th className="px-3 py-2 text-right">בית עסק</th>
                  <th className="px-3 py-2 text-right">סכום</th>
                  <th className="px-3 py-2 text-right">סטטוס</th>
                </tr>
              </thead>
              <tbody>
                {parsed.slice(0, 50).map((row, idx) => (
                  <tr key={idx} className="border-t border-border">
                    <td className="px-3 py-2" dir="ltr">
                      {row.occurredOn}
                    </td>
                    <td className="px-3 py-2">{row.merchantName}</td>
                    <td className="px-3 py-2" dir="ltr">
                      {formatMoney(row.amount)}
                    </td>
                    <td className="px-3 py-2">{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setStep(2)}>
              חזרה
            </Button>
            <Button type="button" onClick={commit} disabled={pending || stats.ready === 0}>
              {pending ? "מייבא…" : `אישור ייבוא (${stats.ready})`}
            </Button>
          </div>
        </div>
      ) : null}

      {step === 4 ? (
        <Alert variant="success">
          <AlertDescription>{message ?? "הייבוא הושלם"}</AlertDescription>
        </Alert>
      ) : null}

      {message && step !== 4 ? (
        <Alert variant="destructive">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
