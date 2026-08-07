import { APP_CURRENCY, APP_LOCALE } from "@/constants/app";

export function formatMoney(amount: number, currency = APP_CURRENCY): string {
  return new Intl.NumberFormat(APP_LOCALE, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}
