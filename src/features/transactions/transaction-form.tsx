"use client";

import { useActionState, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  createTransactionAction,
  updateTransactionAction,
  type TransactionActionResult,
} from "@/features/transactions/actions";
import type { Category, PaymentMethod, TransactionRow } from "@/types/transactions";
import type { HouseholdMember } from "@/types/database";

type Props = {
  members: HouseholdMember[];
  categories: Category[];
  paymentMethods: PaymentMethod[];
  currentUserId: string;
  transaction?: TransactionRow;
};

const initial: TransactionActionResult = { ok: false };

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function TransactionForm({
  members,
  categories,
  paymentMethods,
  currentUserId,
  transaction,
}: Props) {
  const boundUpdate = useMemo(() => {
    if (!transaction) return null;
    return updateTransactionAction.bind(null, transaction.id);
  }, [transaction]);

  const action = transaction && boundUpdate ? boundUpdate : createTransactionAction;
  const [state, formAction, pending] = useActionState(action, initial);

  const [type, setType] = useState<"expense" | "income">(transaction?.type ?? "expense");
  const [isShared, setIsShared] = useState(transaction?.is_shared ?? false);
  const [splitMode, setSplitMode] = useState(transaction?.split_mode ?? "equal");
  const [amount, setAmount] = useState(transaction ? String(transaction.amount) : "");

  const activeMembers = members.filter((m) => m.user_id);
  const memberA = activeMembers[0];
  const memberB = activeMembers[1] ?? activeMembers[0];

  const filteredCategories = categories.filter(
    (c) => c.kind === type || c.kind === "both",
  );

  const amountNum = Number(amount) || 0;
  const half = amountNum ? (Math.round((amountNum * 100) / 2) / 100).toFixed(2) : "";

  return (
    <form action={formAction} className="space-y-5">
      <div className="flex gap-2">
        <Button
          type="button"
          variant={type === "expense" ? "default" : "outline"}
          onClick={() => setType("expense")}
        >
          הוצאה
        </Button>
        <Button
          type="button"
          variant={type === "income" ? "default" : "outline"}
          onClick={() => {
            setType("income");
            setIsShared(false);
          }}
        >
          הכנסה
        </Button>
        <input type="hidden" name="type" value={type} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount">סכום</Label>
        <Input
          id="amount"
          name="amount"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0.01"
          required
          dir="ltr"
          className="text-left text-lg font-semibold"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="merchantName">{type === "income" ? "מקור / תיאור" : "בית עסק"}</Label>
        <Input
          id="merchantName"
          name="merchantName"
          required
          maxLength={120}
          defaultValue={transaction?.merchant_name ?? ""}
          placeholder={type === "income" ? "משכורת" : "סופר"}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="categoryId">קטגוריה</Label>
          <select
            id="categoryId"
            name="categoryId"
            required
            defaultValue={transaction?.category_id ?? ""}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="" disabled>
              בחרו קטגוריה
            </option>
            {filteredCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="occurredOn">תאריך</Label>
          <Input
            id="occurredOn"
            name="occurredOn"
            type="date"
            required
            defaultValue={transaction?.occurred_on ?? todayISO()}
            dir="ltr"
            className="text-left"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="paidBy">מי שילם / קיבל</Label>
          <select
            id="paidBy"
            name="paidBy"
            required
            defaultValue={transaction?.paid_by ?? currentUserId}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {activeMembers.map((m) => (
              <option key={m.user_id!} value={m.user_id!}>
                {m.display_name || m.invite_email || "משתמש"}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="paymentMethodId">אמצעי תשלום</Label>
          <select
            id="paymentMethodId"
            name="paymentMethodId"
            defaultValue={transaction?.payment_method_id ?? ""}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="">ללא</option>
            {paymentMethods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {type === "expense" ? (
        <div className="space-y-3 rounded-xl border border-border p-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="isShared"
              checked={isShared}
              onChange={(e) => setIsShared(e.target.checked)}
              className="size-4 rounded border-input"
            />
            הוצאה משותפת
          </label>

          {isShared ? (
            <div className="space-y-3">
              <input type="hidden" name="participantA" value={memberA?.user_id ?? ""} />
              <input type="hidden" name="participantB" value={memberB?.user_id ?? ""} />

              <div className="space-y-2">
                <Label htmlFor="splitMode">חלוקה</Label>
                <select
                  id="splitMode"
                  name="splitMode"
                  value={splitMode}
                  onChange={(e) =>
                    setSplitMode(e.target.value as "equal" | "percent" | "custom")
                  }
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                >
                  <option value="equal">שווה (50/50)</option>
                  <option value="percent">לפי אחוזים</option>
                  <option value="custom">סכומים ידניים</option>
                </select>
              </div>

              {splitMode === "percent" ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>{memberA?.display_name || "א"} %</Label>
                    <Input
                      name="percentA"
                      type="number"
                      min={0}
                      max={100}
                      step="0.01"
                      defaultValue={50}
                      dir="ltr"
                      className="text-left"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>{memberB?.display_name || "ב"} %</Label>
                    <Input
                      name="percentB"
                      type="number"
                      min={0}
                      max={100}
                      step="0.01"
                      defaultValue={50}
                      dir="ltr"
                      className="text-left"
                    />
                  </div>
                </div>
              ) : null}

              {splitMode === "custom" ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>{memberA?.display_name || "א"} ₪</Label>
                    <Input
                      name="customAmountA"
                      type="number"
                      min={0}
                      step="0.01"
                      defaultValue={half}
                      dir="ltr"
                      className="text-left"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>{memberB?.display_name || "ב"} ₪</Label>
                    <Input
                      name="customAmountB"
                      type="number"
                      min={0}
                      step="0.01"
                      defaultValue={half}
                      dir="ltr"
                      className="text-left"
                    />
                  </div>
                </div>
              ) : null}

              {activeMembers.length < 2 ? (
                <p className="text-xs text-warning">
                  לחלוקה משותפת מומלץ להזמין שותף בהגדרות. כרגע החלוקה תתבצע על משתתף יחיד.
                </p>
              ) : null}
            </div>
          ) : (
            <input type="hidden" name="splitMode" value="personal" />
          )}
        </div>
      ) : (
        <>
          <input type="hidden" name="isShared" value="false" />
          <input type="hidden" name="splitMode" value="personal" />
        </>
      )}

      <details className="rounded-xl border border-border p-4">
        <summary className="cursor-pointer text-sm font-medium">פרטים נוספים</summary>
        <div className="mt-3 space-y-2">
          <Label htmlFor="note">הערה</Label>
          <Input
            id="note"
            name="note"
            maxLength={500}
            defaultValue={transaction?.note ?? ""}
            placeholder="אופציונלי"
          />
        </div>
      </details>

      {state.message && !state.ok ? (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <Button type="submit" className="w-full" disabled={pending} size="lg">
        {pending ? "שומר…" : transaction ? "עדכון תנועה" : "שמירת תנועה"}
      </Button>
    </form>
  );
}
