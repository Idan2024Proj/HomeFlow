import Image from "next/image";
import { APP_NAME } from "@/constants/app";
import { cn } from "@/lib/utils";

type AppLogoProps = {
  className?: string;
  size?: "sm" | "md" | "lg";
  showName?: boolean;
};

const SIZES = {
  sm: { px: 28, className: "size-7" },
  md: { px: 40, className: "size-10" },
  lg: { px: 72, className: "size-[4.5rem]" },
} as const;

export function AppLogo({ className, size = "md", showName = false }: AppLogoProps) {
  const dim = SIZES[size];

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Image
        src="/logo.png"
        alt={APP_NAME}
        width={dim.px}
        height={dim.px}
        className={cn("shrink-0 rounded-full", dim.className)}
        priority={size === "lg"}
      />
      {showName ? (
        <span className="text-sm font-semibold text-primary">{APP_NAME}</span>
      ) : null}
    </span>
  );
}
