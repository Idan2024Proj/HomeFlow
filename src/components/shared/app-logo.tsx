import { APP_NAME } from "@/constants/app";
import { cn } from "@/lib/utils";

type AppLogoProps = {
  className?: string;
  size?: "sm" | "md" | "lg";
  showName?: boolean;
};

const SIZES = {
  sm: "size-9",
  md: "size-12",
  lg: "size-24",
} as const;

export function AppLogo({ className, size = "md", showName = false }: AppLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.png"
        alt={APP_NAME}
        width={size === "lg" ? 96 : size === "md" ? 48 : 36}
        height={size === "lg" ? 96 : size === "md" ? 48 : 36}
        className={cn("shrink-0 rounded-full object-cover", SIZES[size])}
        decoding="async"
      />
      {showName ? (
        <span className="text-sm font-semibold text-primary">{APP_NAME}</span>
      ) : null}
    </span>
  );
}
