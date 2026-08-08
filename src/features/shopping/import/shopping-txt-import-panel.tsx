"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { FileText, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { parseShoppingText } from "@/features/shopping/import";
import { addItemsBulkAction } from "@/features/shopping/actions";
import type { ParsedShoppingItem } from "@/features/shopping/import";

type PreviewItem = ParsedShoppingItem & { key: string };

type Props = {
  listId: string | null;
  maxKb: number;
  onClose: () => void;
  onImported: () => void;
};

function isTxtFile(file: File) {
  const nameOk = file.name.toLowerCase().endsWith(".txt");
  const typeOk =
    !file.type ||
    file.type === "text/plain" ||
    file.type === "application/octet-stream";
  return nameOk && typeOk;
}

export function ShoppingTxtImportPanel({
  listId,
  maxKb,
  onClose,
  onImported,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<PreviewItem[] | null>(null);
  const [mergedHint, setMergedHint] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const count = items?.length ?? 0;

  const title = useMemo(() => {
    if (!items) return "ייבוא רשימה מקובץ";
    return `נמצאו ${count} פריטים`;
  }, [items, count]);

  async function readFile(file: File) {
    setError(null);
    setMergedHint(null);
    setItems(null);

    if (!isTxtFile(file)) {
      setError("לא הצלחנו לקרוא את הקובץ. ודא שמדובר בקובץ TXT.");
      return;
    }

    const maxBytes = Math.max(1, maxKb) * 1024;
    if (file.size > maxBytes) {
      setError(`הקובץ גדול מדי. מקסימום ${maxKb}KB.`);
      return;
    }

    let text: string;
    try {
      text = await file.text();
    } catch {
      setError("לא הצלחנו לקרוא את הקובץ. ודא שמדובר בקובץ TXT.");
      return;
    }

    const parsed = parseShoppingText(text);
    if (parsed.items.length === 0) {
      setError("לא נמצאו מוצרים ברשימה.");
      return;
    }

    setItems(
      parsed.items.map((item, index) => ({
        ...item,
        key: `${index}-${item.name}`,
      })),
    );
    if (parsed.mergedCount > 0) {
      setMergedHint(`מוזגו ${parsed.mergedCount} כפילויות זהות.`);
    }
  }

  function updateItem(key: string, patch: Partial<PreviewItem>) {
    setItems((prev) =>
      prev ? prev.map((item) => (item.key === key ? { ...item, ...patch } : item)) : prev,
    );
  }

  function removeItem(key: string) {
    setItems((prev) => (prev ? prev.filter((item) => item.key !== key) : prev));
  }

  function addBlank() {
    setItems((prev) => [
      ...(prev ?? []),
      {
        key: `new-${Date.now()}`,
        rawText: "",
        name: "",
        quantity: 1,
        unit: null,
        notes: null,
      },
    ]);
  }

  function confirmImport() {
    if (!listId) {
      setError("צרו רשימת קניות לפני הייבוא.");
      return;
    }
    if (!items || items.length === 0) {
      setError("לא נמצאו מוצרים ברשימה.");
      return;
    }

    const cleaned = items
      .map((item) => ({
        name: item.name.trim(),
        quantity: Number(item.quantity) || 1,
        unit: item.unit,
        rawText: item.rawText || item.name,
      }))
      .filter((item) => item.name.length > 0);

    if (cleaned.length === 0) {
      setError("לא נמצאו מוצרים ברשימה.");
      return;
    }

    startTransition(async () => {
      const result = await addItemsBulkAction({ listId, items: cleaned });
      if (!result.ok) {
        setError(result.message ?? "הייבוא נכשל");
        return;
      }
      onImported();
    });
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-2xl border border-border bg-background shadow-lg sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="font-semibold">{title}</p>
            <p className="text-xs text-muted-foreground">קובץ TXT בלבד · עד {maxKb}KB</p>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="סגור">
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          {mergedHint ? (
            <Alert>
              <AlertDescription>{mergedHint}</AlertDescription>
            </Alert>
          ) : null}

          {!items ? (
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border px-4 py-10 text-center">
              <FileText className="size-8 text-muted-foreground" aria-hidden />
              <p className="text-sm text-muted-foreground">
                בחרו קובץ טקסט עם מוצרים — שורה לכל פריט
              </p>
              <Button
                type="button"
                className="min-h-12 w-full max-w-xs"
                onClick={() => inputRef.current?.click()}
              >
                בחירת קובץ TXT
              </Button>
              <input
                ref={inputRef}
                type="file"
                accept=".txt,text/plain"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void readFile(file);
                  e.target.value = "";
                }}
              />
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.key}
                  className="grid grid-cols-[1fr_5.5rem_auto] items-center gap-2 rounded-xl border border-border p-2"
                >
                  <div className="space-y-1">
                    <Label className="sr-only">שם מוצר</Label>
                    <Input
                      value={item.name}
                      onChange={(e) => updateItem(item.key, { name: e.target.value })}
                      placeholder="שם מוצר"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="sr-only">כמות</Label>
                    <Input
                      type="number"
                      min={0.1}
                      step={0.1}
                      dir="ltr"
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(item.key, {
                          quantity: Number(e.target.value) || 1,
                        })
                      }
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(item.key)}
                    aria-label="הסר"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={addBlank} className="w-full">
                <Plus className="size-4" aria-hidden />
                הוסף מוצר נוסף
              </Button>
            </div>
          )}
        </div>

        <div className="flex gap-2 border-t border-border p-4">
          <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>
            בטל
          </Button>
          {items ? (
            <Button
              type="button"
              className="flex-1"
              disabled={pending || count === 0}
              onClick={confirmImport}
            >
              {pending ? "מוסיף…" : `הוסף ${count} מוצרים לרשימה`}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
