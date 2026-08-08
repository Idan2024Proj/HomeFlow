import type { Metadata } from "next";
import Link from "next/link";
import { NAV_DESKTOP } from "@/constants/app";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "עוד | HomeFlow" };

const MORE = NAV_DESKTOP.filter((i) =>
  [
    "/budgets",
    "/settlements",
    "/savings",
    "/reports",
    "/import",
    "/receipts",
    "/prices",
    "/settings",
  ].includes(i.href),
);

export default function MorePage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">עוד</h1>
      <div className="flex flex-col gap-2">
        {MORE.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(buttonVariants({ variant: "outline" }), "justify-start")}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
