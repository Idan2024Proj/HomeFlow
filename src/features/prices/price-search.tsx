"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatMoney } from "@/lib/utils/money";
import type { PriceSearchHit } from "@/lib/supermarket/types";

export function PriceSearch({ initialQuery = "חלב" }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [hits, setHits] = useState<PriceSearchHit[]>([]);
  const [source, setSource] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function search(nextQuery = query) {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/prices/search?q=${encodeURIComponent(nextQuery)}`);
      const json = (await res.json()) as {
        ok: boolean;
        message?: string;
        hits?: PriceSearchHit[];
        source?: string;
      };
      if (!json.ok) {
        setHits([]);
        setError(json.message ?? "החיפוש נכשל");
        return;
      }
      setHits(json.hits ?? []);
      setSource(json.source ?? null);
      if (!(json.hits && json.hits.length)) {
        setError("לא נמצאו מוצרים תואמים");
      }
    });
  }

  useEffect(() => {
    search(initialQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          search();
        }}
      >
        <Input
          data-testid="price-search-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="חפשו מוצר, למשל חלב"
          className="flex-1"
        />
        <Button data-testid="price-search-submit" type="submit" disabled={pending}>
          {pending ? "מחפש…" : "חיפוש מחיר"}
        </Button>
      </form>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {source ? (
        <p className="text-xs text-muted-foreground" data-testid="price-search-source">
          מקור: {source === "database" ? "מסד נתונים" : "הזנת שקיפות מחירים (שופרסל)"}
        </p>
      ) : null}

      <ul className="space-y-2" data-testid="price-search-results">
        {hits.map((hit) => (
          <li
            key={`${hit.productCode}-${hit.price}`}
            data-testid="price-search-result"
            className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3"
          >
            <div className="min-w-0">
              <p className="font-medium" data-testid="price-product-name">
                {hit.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {hit.chainName}
                {hit.storeName ? ` · ${hit.storeName}` : ""}
              </p>
            </div>
            <p
              className="shrink-0 text-base font-semibold tabular-nums"
              data-testid="price-product-price"
              dir="ltr"
            >
              {formatMoney(hit.price)}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
