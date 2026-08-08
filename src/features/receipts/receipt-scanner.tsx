"use client";

import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Camera, ImagePlus, Loader2, Plus, Trash2, Upload } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  buildReceiptWarnings,
  uncertainFields,
  type ParsedReceipt,
  type ParsedReceiptItem,
} from "@/lib/receipts/schema";
import { createExpenseFromReceiptAction } from "@/features/receipts/actions";
import type { Category } from "@/types/transactions";
import type { HouseholdMember } from "@/types/database";

type Step = "upload" | "preview" | "scanning" | "review" | "done";

type Props = {
  members: HouseholdMember[];
  categories: Category[];
  currentUserId: string;
  geminiConfigured: boolean;
};

function emptyReceipt(): ParsedReceipt {
  return {
    merchant: null,
    date: new Date().toISOString().slice(0, 10),
    total: null,
    currency: "ILS",
    items: [],
  };
}

function emptyItem(): ParsedReceiptItem {
  return { name: "", quantity: 1, unitPrice: null, totalPrice: null };
}

export function ReceiptScanner({
  members,
  categories,
  currentUserId,
  geminiConfigured,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ParsedReceipt>(emptyReceipt);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState(
    () => categories.find((c) => c.kind !== "income")?.id ?? "",
  );
  const [paidBy, setPaidBy] = useState(currentUserId);
  const [isShared, setIsShared] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [pending, startTransition] = useTransition();

  const activeMembers = members.filter((m) => m.user_id);
  const expenseCategories = categories.filter((c) => c.kind !== "income");
  const uncertain = useMemo(() => uncertainFields(receipt), [receipt]);

  const setImage = useCallback((next: File | null) => {
    setError(null);
    setMessage(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (!next) {
      setFile(null);
      setPreviewUrl(null);
      setStep("upload");
      return;
    }
    setFile(next);
    setPreviewUrl(URL.createObjectURL(next));
    setStep("preview");
  }, [previewUrl]);

  const onFiles = (list: FileList | null) => {
    const chosen = list?.[0];
    if (!chosen) return;
    if (!chosen.type.startsWith("image/")) {
      setError("נא לבחור קובץ תמונה");
      return;
    }
    setImage(chosen);
  };

  async function scanReceipt() {
    if (!file) return;
    setError(null);
    setMessage(null);
    setStep("scanning");

    const body = new FormData();
    body.append("image", file);

    try {
      const res = await fetch("/api/receipts/analyze", {
        method: "POST",
        body,
      });
      const json = (await res.json()) as {
        ok: boolean;
        message?: string;
        code?: string;
        data?: ParsedReceipt;
        warnings?: string[];
      };

      if (!json.ok || !json.data) {
        setReceipt(emptyReceipt());
        setWarnings([]);
        setError(json.message ?? "הסריקה נכשלה");
        setStep("review");
        setMessage("אפשר למלא את הפרטים ידנית ולהמשיך.");
        return;
      }

      setReceipt({
        ...json.data,
        currency: json.data.currency ?? "ILS",
        date: json.data.date ?? new Date().toISOString().slice(0, 10),
      });
      setWarnings(json.warnings ?? buildReceiptWarnings(json.data));
      setStep("review");
    } catch {
      setReceipt(emptyReceipt());
      setError("אין חיבור לשרת הסריקה. מלאו ידנית או נסו שוב.");
      setStep("review");
    }
  }

  function updateItem(index: number, patch: Partial<ParsedReceiptItem>) {
    setReceipt((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }));
  }

  function removeItem(index: number) {
    setReceipt((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  }

  function addItem() {
    setReceipt((prev) => ({ ...prev, items: [...prev.items, emptyItem()] }));
  }

  function saveExpense() {
    setError(null);
    startTransition(async () => {
      const memberA = activeMembers[0]?.user_id ?? paidBy;
      const memberB = activeMembers[1]?.user_id ?? memberA;
      const result = await createExpenseFromReceiptAction({
        merchant: receipt.merchant?.trim() || "בית עסק",
        date: receipt.date || new Date().toISOString().slice(0, 10),
        total: Number(receipt.total) || 0,
        currency: receipt.currency ?? "ILS",
        categoryId,
        paidBy,
        isShared,
        splitMode: isShared ? "equal" : "personal",
        participantA: isShared ? memberA : undefined,
        participantB: isShared ? memberB : undefined,
        items: receipt.items.filter((i) => i.name.trim()),
      });

      if (!result.ok) {
        setError(result.message ?? "שמירה נכשלה");
        return;
      }

      setTransactionId(result.transactionId ?? null);
      setMessage(result.message ?? "הקבלה נוספה בהצלחה");
      setStep("done");
    });
  }

  function resetAll() {
    setImage(null);
    setReceipt(emptyReceipt());
    setWarnings([]);
    setError(null);
    setMessage(null);
    setTransactionId(null);
    setStep("upload");
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <Alert>
        <AlertDescription>
          <span className="font-medium">Beta</span> — סריקת קבלות עם AI עדיין בניסוי.
          {!geminiConfigured
            ? " מפתח Gemini עדיין לא הוגדר; אפשר להעלות תמונה ולמלא פרטים ידנית."
            : " התוצאות עלולות לדרוש בדיקה ידנית לפני שמירה."}
        </AlertDescription>
      </Alert>

      {step === "upload" ? (
        <Card>
          <CardHeader>
            <CardTitle>העלאת קבלה</CardTitle>
            <CardDescription>צלמו, בחרו תמונה, או גררו לכאן</CardDescription>
          </CardHeader>
          <CardContent>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                onFiles(e.dataTransfer.files);
              }}
              className={cn(
                "flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border bg-surface px-6 py-12 text-center",
                dragging && "border-primary bg-primary/5",
              )}
            >
              <Upload className="size-8 text-muted-foreground" aria-hidden />
              <p className="text-sm text-muted-foreground">גררו תמונה לכאן</p>
              <p className="text-xs text-muted-foreground">או</p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
                  <ImagePlus className="size-4" aria-hidden />
                  בחר תמונה
                </Button>
                <Button type="button" onClick={() => cameraRef.current?.click()}>
                  <Camera className="size-4" aria-hidden />
                  צלם קבלה
                </Button>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onFiles(e.target.files)}
              />
              <input
                ref={cameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => onFiles(e.target.files)}
              />
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === "preview" && previewUrl ? (
        <Card>
          <CardHeader>
            <CardTitle>קבלה</CardTitle>
            <CardDescription>בדקו את התמונה לפני הסריקה</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="תצוגת קבלה"
              className="mx-auto max-h-80 w-full rounded-xl object-contain bg-muted"
            />
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={scanReceipt} disabled={!geminiConfigured}>
                סרוק קבלה
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setReceipt(emptyReceipt());
                  setStep("review");
                  setMessage("מילוי ידני — בלי סריקת AI");
                }}
              >
                מילוי ידני
              </Button>
              <Button type="button" variant="ghost" onClick={resetAll}>
                החלף תמונה
              </Button>
            </div>
            {!geminiConfigured ? (
              <p className="text-sm text-muted-foreground">
                סריקה אוטומטית לא פעילה עד שיוגדר GEMINI_API_KEY בשרת.
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {step === "scanning" ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16">
            <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
            <p className="text-sm text-muted-foreground">קורא את הקבלה...</p>
            <div className="h-2 w-48 animate-pulse rounded-full bg-muted" />
          </CardContent>
        </Card>
      ) : null}

      {step === "review" ? (
        <div className="space-y-4">
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          {message ? (
            <Alert>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          ) : null}
          {warnings.map((w) => (
            <Alert key={w}>
              <AlertDescription>{w}</AlertDescription>
            </Alert>
          ))}

          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="תצוגת קבלה"
              className="mx-auto max-h-48 w-full rounded-xl object-contain bg-muted"
            />
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>פרטי קבלה</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2 sm:col-span-1">
                <Label htmlFor="merchant">בית עסק</Label>
                <Input
                  id="merchant"
                  value={receipt.merchant ?? ""}
                  onChange={(e) =>
                    setReceipt((r) => ({ ...r, merchant: e.target.value || null }))
                  }
                  className={cn(uncertain.has("merchant") && "border-amber-500")}
                />
                {uncertain.has("merchant") ? (
                  <p className="text-xs text-amber-700 dark:text-amber-400">כדאי לבדוק</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">תאריך</Label>
                <Input
                  id="date"
                  type="date"
                  value={receipt.date ?? ""}
                  onChange={(e) =>
                    setReceipt((r) => ({ ...r, date: e.target.value || null }))
                  }
                  className={cn(uncertain.has("date") && "border-amber-500")}
                />
                {uncertain.has("date") ? (
                  <p className="text-xs text-amber-700 dark:text-amber-400">כדאי לבדוק</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="total">סכום כולל</Label>
                <Input
                  id="total"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  value={receipt.total ?? ""}
                  onChange={(e) =>
                    setReceipt((r) => ({
                      ...r,
                      total: e.target.value === "" ? null : Number(e.target.value),
                    }))
                  }
                  className={cn(uncertain.has("total") && "border-amber-500")}
                />
                {uncertain.has("total") ? (
                  <p className="text-xs text-amber-700 dark:text-amber-400">כדאי לבדוק</p>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle>מוצרים</CardTitle>
                <CardDescription>עריכה לפני שמירה</CardDescription>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="size-4" aria-hidden />
                הוסף מוצר
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Desktop table header */}
              <div className="hidden grid-cols-[1.4fr_0.6fr_0.8fr_0.8fr_auto] gap-2 text-xs text-muted-foreground md:grid">
                <span>מוצר</span>
                <span>כמות</span>
                <span>מחיר יחידה</span>
                <span>סה״כ</span>
                <span />
              </div>

              {receipt.items.length === 0 ? (
                <p className="text-sm text-muted-foreground">אין מוצרים — אפשר להוסיף ידנית.</p>
              ) : (
                receipt.items.map((item, index) => (
                  <div
                    key={index}
                    className="grid gap-2 rounded-xl border border-border p-3 md:grid-cols-[1.4fr_0.6fr_0.8fr_0.8fr_auto] md:items-center md:border-0 md:p-0"
                  >
                    <Input
                      placeholder="שם מוצר"
                      value={item.name}
                      onChange={(e) => updateItem(index, { name: e.target.value })}
                    />
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="0.01"
                      placeholder="כמות"
                      value={item.quantity ?? ""}
                      onChange={(e) =>
                        updateItem(index, {
                          quantity: e.target.value === "" ? null : Number(e.target.value),
                        })
                      }
                    />
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="0.01"
                      placeholder="מחיר יחידה"
                      value={item.unitPrice ?? ""}
                      onChange={(e) =>
                        updateItem(index, {
                          unitPrice: e.target.value === "" ? null : Number(e.target.value),
                        })
                      }
                    />
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="0.01"
                      placeholder="סה״כ"
                      value={item.totalPrice ?? ""}
                      onChange={(e) =>
                        updateItem(index, {
                          totalPrice: e.target.value === "" ? null : Number(e.target.value),
                        })
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(index)}
                      aria-label="הסר מוצר"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>שיוך הוצאה</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="category">קטגוריה</Label>
                <select
                  id="category"
                  className="flex h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                >
                  {expenseCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="paidBy">מי שילם</Label>
                <select
                  id="paidBy"
                  className="flex h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
                  value={paidBy}
                  onChange={(e) => setPaidBy(e.target.value)}
                >
                  {activeMembers.map((m) => (
                    <option key={m.user_id!} value={m.user_id!}>
                      {m.display_name || m.invite_email || "משתמש"}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input
                  type="checkbox"
                  checked={isShared}
                  onChange={(e) => setIsShared(e.target.checked)}
                />
                הוצאה משותפת (חלוקה שווה)
              </label>
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={saveExpense} disabled={pending || !categoryId}>
              {pending ? "שומר…" : "צור הוצאה"}
            </Button>
            <Button type="button" variant="ghost" onClick={resetAll}>
              ביטול
            </Button>
          </div>
        </div>
      ) : null}

      {step === "done" ? (
        <Card>
          <CardHeader>
            <CardTitle>הקבלה נוספה בהצלחה</CardTitle>
            <CardDescription>{message}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {transactionId ? (
              <Link
                href={`/transactions/${transactionId}`}
                className={cn(buttonVariants())}
              >
                הצג הוצאה
              </Link>
            ) : null}
            <Button type="button" variant="outline" onClick={resetAll}>
              סרוק קבלה נוספת
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
