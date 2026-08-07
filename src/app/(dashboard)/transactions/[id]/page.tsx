import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAuthUser, getMembershipContext } from "@/lib/supabase/auth";
import {
  getTransaction,
  listActiveMembers,
  listCategories,
  listPaymentMethods,
} from "@/features/transactions/data";
import { TransactionForm } from "@/features/transactions/transaction-form";
import { deleteTransactionAction } from "@/features/transactions/actions";
import { buttonVariants } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/utils/money";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "פרטי תנועה | HomeFlow",
};

export const dynamic = "force-dynamic";

export default async function TransactionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getAuthUser();
  const context = await getMembershipContext();
  if (!user || !context) return null;

  const [transaction, members, categories, paymentMethods] = await Promise.all([
    getTransaction(context.household.id, id),
    listActiveMembers(context.household.id),
    listCategories(context.household.id),
    listPaymentMethods(context.household.id),
  ]);

  if (!transaction) notFound();

  const memberName = (userId: string) =>
    members.find((m) => m.user_id === userId)?.display_name ||
    members.find((m) => m.user_id === userId)?.invite_email ||
    "משתמש";

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{transaction.merchant_name}</h1>
          <p className="text-sm text-muted-foreground">
            {transaction.type === "expense" ? "הוצאה" : "הכנסה"} ·{" "}
            {formatMoney(transaction.amount)}
          </p>
        </div>
        <Link href="/transactions" className={cn(buttonVariants({ variant: "ghost" }))}>
          חזרה
        </Link>
      </div>

      {transaction.splits && transaction.splits.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>חלוקה</CardTitle>
            <CardDescription>
              {transaction.is_shared ? "הוצאה משותפת" : "הוצאה אישית"} · {transaction.split_mode}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {transaction.splits.map((split) => (
              <div key={split.id} className="flex justify-between gap-3">
                <span>{memberName(split.user_id)}</span>
                <span className="tabular-nums" dir="ltr">
                  {formatMoney(Number(split.share_amount))}
                  {split.share_percent != null ? ` (${split.share_percent}%)` : ""}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>עריכה</CardTitle>
        </CardHeader>
        <CardContent>
          <TransactionForm
            members={members}
            categories={categories}
            paymentMethods={paymentMethods}
            currentUserId={user.id}
            transaction={transaction}
          />
        </CardContent>
      </Card>

      <form
        action={deleteTransactionAction.bind(null, transaction.id)}
        className="rounded-xl border border-destructive/20 p-4"
      >
        <p className="mb-3 text-sm text-muted-foreground">
          מחיקה רכה — התנועה תוסתר מהרשימות.
        </p>
        <Button type="submit" variant="destructive">
          מחיקת תנועה
        </Button>
      </form>
    </div>
  );
}
