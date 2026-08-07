import type { Metadata } from "next";
import { getMembershipContext, listHouseholdMembers } from "@/lib/supabase/auth";
import { InviteMemberForm } from "@/features/auth/invite-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { ThemeToggle } from "@/components/shared/theme-toggle";

export const metadata: Metadata = {
  title: "הגדרות | HomeFlow",
};

export default async function SettingsPage() {
  const context = await getMembershipContext();
  if (!context) {
    return null;
  }

  const members = await listHouseholdMembers(context.household.id);
  const isOwner = context.membership.role === "owner";

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">הגדרות</h1>
        <p className="text-sm text-muted-foreground">משק הבית, מראה והזמנות</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>מראה</CardTitle>
          <CardDescription>בחרו מצב בהיר, חשוך, או לפי המערכת</CardDescription>
        </CardHeader>
        <CardContent>
          <ThemeToggle />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>משק הבית</CardTitle>
          <CardDescription>{context.household.name}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          <p>מטבע: {context.household.currency}</p>
          <p>אזור זמן: {context.household.timezone}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>משתמשים</CardTitle>
          <CardDescription>חברים פעילים והזמנות ממתינות</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ul className="divide-y divide-border rounded-xl border border-border">
            {members.map((member) => (
              <li
                key={member.id}
                className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">
                    {member.display_name || member.invite_email || "משתמש"}
                  </p>
                  <p className="truncate text-muted-foreground" dir="ltr">
                    {member.invite_email ?? ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {member.role === "owner" ? "בעלים" : "חבר"}
                  </span>
                  <StatusBadge status={member.status} />
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {isOwner ? (
        <Card>
          <CardHeader>
            <CardTitle>הזמנת שותף</CardTitle>
            <CardDescription>
              אין הרשמה ציבורית — רק כתובת שהוזמנה תוכל להצטרף
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InviteMemberForm />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
