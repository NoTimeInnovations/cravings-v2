import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ButtonV2Props {
  href?: string;
  onClick?: () => void;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
  showArrow?: boolean;
}

export function ButtonV2({
  href,
  onClick,
  children,
  variant = "primary",
  className,
  type = "button",
  disabled,
  showArrow = true,
}: ButtonV2Props) {
  const baseStyles = "inline-flex items-center gap-2 text-[13px] font-medium transition-all duration-300 ease-in-out";

  const variants = {
    primary: cn(
      baseStyles,
      "rounded-full bg-orange-100/70 pl-4 pr-1.5 py-2 text-orange-600 hover:bg-orange-600 hover:text-white border border-orange-600/30 hover:border-orange-600 group",
    ),
    secondary: cn(
      baseStyles,
      "rounded-full border border-stone-300 bg-transparent px-4 py-2.5 text-stone-800 hover:bg-stone-100 hover:text-stone-900 hover:border-stone-500",
    ),
  };

  const content = (
    <>
      {children}
      {variant === "primary" && showArrow && (
        <span className="flex items-center justify-center w-6 h-6 rounded-full border border-orange-600/30 group-hover:border-white/30 transition-all duration-300">
          <ArrowRight className="w-3 h-3" />
        </span>
      )}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={cn(variants[variant], className)}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(variants[variant], className, disabled && "opacity-50 cursor-not-allowed")}
    >
      {content}
    </button>
  );
}
