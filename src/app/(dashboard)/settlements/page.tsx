import type { Metadata } from "next";
import { getMembershipContext } from "@/lib/supabase/auth";
import { getSettlementSummary, createSettlementAction } from "@/features/settlements/actions";
import { SettlementClient } from "@/features/settlements/settlement-client";
import { formatMoney } from "@/lib/utils/money";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "התחשבנות | HomeFlow" };
export const dynamic = "force-dynamic";

export default async function SettlementsPage() {
  const context = await getMembershipContext();
  if (!context) return null;

  const data = await getSettlementSummary(context.household.id);
  const nameOf = (id: string) =>
    data.members.find((m) => m.user_id === id)?.display_name || "משתמש";

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">התחשבנות</h1>
        <p className="text-sm text-muted-foreground">מי חייב למי — בלי נוסחאות מסובכות</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{data.summary.headline}</CardTitle>
          <CardDescription>מבוסס על הוצאות משותפות והעברות שנסגרו</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.summary.balances.map((b) => (
            <div key={b.userId} className="flex justify-between text-sm">
              <span>{b.displayName}</span>
              <span className="tabular-nums" dir="ltr">
                {b.net >= 0 ? "+" : ""}
                {formatMoney(b.net)}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      {data.summary.transfers.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>להשלמת איזון</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data.summary.transfers.map((t, idx) => (
              <p key={idx}>
                {nameOf(t.fromUserId)} → {nameOf(t.toUserId)}:{" "}
                <strong>{formatMoney(t.amount)}</strong>
              </p>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>סגירת חוב</CardTitle>
        </CardHeader>
        <CardContent>
          <SettlementClient
            members={data.members.map((m) => ({
              id: m.user_id!,
              name: m.display_name || "משתמש",
            }))}
            suggested={data.summary.transfers[0]}
            action={createSettlementAction}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>היסטוריה</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {data.history.length === 0 ? (
            <p className="text-muted-foreground">אין העברות עדיין.</p>
          ) : (
            data.history.map((s) => (
              <div key={s.id as string} className="flex justify-between border-b border-border py-2">
                <span>
                  {nameOf(s.from_user_id as string)} → {nameOf(s.to_user_id as string)}
                </span>
                <span className="tabular-nums">{formatMoney(Number(s.amount))}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
