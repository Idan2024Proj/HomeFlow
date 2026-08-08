"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  addItemAction,
  createListAction,
  deleteItemAction,
  toggleItemAction,
  type ActionResult,
} from "@/features/shopping/actions";
import { ShoppingTxtImportPanel } from "@/features/shopping/import/shopping-txt-import-panel";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/utils/money";
import { useEffect } from "react";
import { FileUp, Plus } from "lucide-react";

const initial: ActionResult = { ok: false };

type Item = {
  id: string;
  name: string;
  quantity: number;
  estimated_price: number | null;
  is_checked: boolean;
  category: string | null;
};

export function ShoppingClient({
  householdId,
  lists,
  initialItems,
  activeListId,
  txtMaxKb,
}: {
  householdId: string;
  lists: Array<{ id: string; name: string }>;
  initialItems: Item[];
  activeListId: string | null;
  txtMaxKb: number;
}) {
  const [localOverrides, setLocalOverrides] = useState<Record<string, Partial<Item>>>({});
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [shopMode, setShopMode] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showTxtImport, setShowTxtImport] = useState(false);
  const [, startTransition] = useTransition();
  const [listState, listAction, listPending] = useActionState(createListAction, initial);
  const [, itemAction, itemPending] = useActionState(addItemAction, initial);

  useEffect(() => {
    if (!activeListId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`shopping:${activeListId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "shopping_items",
          filter: `list_id=eq.${activeListId}`,
        },
        () => {
          window.location.reload();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [activeListId, householdId]);

  const items = useMemo(() => {
    return initialItems
      .filter((item) => !removedIds.includes(item.id))
      .map((item) => ({ ...item, ...localOverrides[item.id] }));
  }, [initialItems, localOverrides, removedIds]);

  const sorted = useMemo(() => {
    const open = items.filter((i) => !i.is_checked);
    const done = items.filter((i) => i.is_checked);
    return shopMode ? [...open, ...done] : items;
  }, [items, shopMode]);

  const estimatedTotal = items.reduce(
    (s, i) => s + (Number(i.estimated_price) || 0) * Number(i.quantity || 1),
    0,
  );

  const isEmpty = items.length === 0;

  return (
    <div className={cn("space-y-4", shopMode && "pb-28")}>
      <div className="flex flex-wrap gap-2">
        {lists.map((list) => (
          <a
            key={list.id}
            href={`/shopping?list=${list.id}`}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-sm",
              list.id === activeListId
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border",
            )}
          >
            {list.name}
          </a>
        ))}
      </div>

      <form action={listAction} className="flex gap-2">
        <Input name="name" placeholder="רשימה חדשה" className="flex-1" />
        <Button type="submit" variant="outline" disabled={listPending}>
          הוסף רשימה
        </Button>
      </form>
      {listState.message && !listState.ok ? (
        <p className="text-sm text-destructive">{listState.message}</p>
      ) : null}

      {activeListId ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            className="min-h-11 flex-1"
            onClick={() => {
              setShowTxtImport(false);
              setShowAddForm((v) => !v);
            }}
          >
            <Plus className="size-4" aria-hidden />
            הוסף מוצר
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 flex-1"
            onClick={() => {
              setShowAddForm(false);
              setShowTxtImport(true);
            }}
          >
            <FileUp className="size-4" aria-hidden />
            ייבוא רשימה מקובץ
          </Button>
        </div>
      ) : null}

      {activeListId && showAddForm ? (
        <form action={itemAction} className="flex flex-col gap-2 rounded-xl border border-border p-3 sm:flex-row">
          <input type="hidden" name="listId" value={activeListId} />
          <Input name="name" placeholder="פריט חדש" required className="flex-1" autoFocus />
          <Input
            name="quantity"
            type="number"
            min="0.1"
            step="0.1"
            defaultValue="1"
            className="w-24"
            dir="ltr"
          />
          <Input
            name="estimatedPrice"
            type="number"
            min="0"
            step="0.01"
            placeholder="מחיר"
            className="w-28"
            dir="ltr"
          />
          <Button type="submit" disabled={itemPending}>
            הוסף
          </Button>
        </form>
      ) : null}

      {activeListId && isEmpty && !showAddForm ? (
        <div className="rounded-2xl border border-dashed border-border px-4 py-10 text-center">
          <p className="font-medium">רשימת הקניות שלך עדיין ריקה</p>
          <p className="mt-1 text-sm text-muted-foreground">
            ניתן להוסיף מוצרים ידנית או לייבא רשימה מקובץ TXT.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button type="button" onClick={() => setShowAddForm(true)}>
              הוסף מוצר
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowTxtImport(true)}>
              ייבא TXT
            </Button>
          </div>
        </div>
      ) : null}

      {!isEmpty ? (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">אומדן: {formatMoney(estimatedTotal)}</p>
          <Button type="button" variant="secondary" onClick={() => setShopMode((v) => !v)}>
            {shopMode ? "יציאה ממצב קנייה" : "מצב קנייה"}
          </Button>
        </div>
      ) : null}

      <ul className="space-y-2">
        {sorted.map((item) => (
          <li
            key={item.id}
            className={cn(
              "flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-3",
              item.is_checked && "opacity-60",
              shopMode && "py-4",
            )}
          >
            <input
              type="checkbox"
              className={cn("size-5", shopMode && "size-7")}
              checked={item.is_checked}
              onChange={(e) => {
                const checked = e.target.checked;
                setLocalOverrides((prev) => ({
                  ...prev,
                  [item.id]: { ...prev[item.id], is_checked: checked },
                }));
                startTransition(async () => {
                  await toggleItemAction(item.id, checked);
                });
              }}
            />
            <div className="min-w-0 flex-1">
              <p className={cn("font-medium", item.is_checked && "line-through")}>{item.name}</p>
              <p className="text-xs text-muted-foreground">
                ×{item.quantity}
                {item.estimated_price != null
                  ? ` · ${formatMoney(Number(item.estimated_price))}`
                  : ""}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setRemovedIds((prev) => [...prev, item.id]);
                startTransition(async () => {
                  await deleteItemAction(item.id);
                });
              }}
            >
              מחק
            </Button>
          </li>
        ))}
      </ul>

      {shopMode ? (
        <div className="fixed inset-x-0 bottom-16 z-30 border-t border-border bg-surface p-4 md:bottom-0">
          <Button className="w-full" size="lg" onClick={() => setShopMode(false)}>
            סיום קנייה · {formatMoney(estimatedTotal)}
          </Button>
        </div>
      ) : null}

      {showTxtImport ? (
        <ShoppingTxtImportPanel
          listId={activeListId}
          maxKb={txtMaxKb}
          onClose={() => setShowTxtImport(false)}
          onImported={() => {
            setShowTxtImport(false);
            window.location.reload();
          }}
        />
      ) : null}
    </div>
  );
}
