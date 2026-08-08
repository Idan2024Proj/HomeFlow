export const APP_NAME = "HomeFlow";
export const APP_CURRENCY = "ILS";
export const APP_TIMEZONE = "Asia/Jerusalem";
export const APP_LOCALE = "he-IL";

export const NAV_DESKTOP = [
  { href: "/", label: "בית" },
  { href: "/transactions", label: "תנועות" },
  { href: "/budgets", label: "תקציב" },
  { href: "/shopping", label: "קניות" },
  { href: "/settlements", label: "התחשבנות" },
  { href: "/savings", label: "יעדי חיסכון" },
  { href: "/reports", label: "דוחות" },
  { href: "/import", label: "ייבוא" },
  { href: "/receipts", label: "קבלה (Beta)" },
  { href: "/prices", label: "מחירי סופר" },
  { href: "/settings", label: "הגדרות" },
] as const;

export const NAV_MOBILE = [
  { href: "/", label: "בית" },
  { href: "/transactions", label: "תנועות" },
  { href: "/transactions/new", label: "הוספה" },
  { href: "/shopping", label: "קניות" },
  { href: "/more", label: "עוד" },
] as const;
