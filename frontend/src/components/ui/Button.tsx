import Link from "next/link";
import { clsx } from "clsx";
import { ArrowRight, LoaderCircle } from "lucide-react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success" | "white";
type Size = "sm" | "md" | "lg";

const base =
  "group/btn relative inline-flex select-none items-center justify-center gap-2 rounded-full font-semibold tracking-[-0.01em] transition-[background,box-shadow,transform,color] duration-300 ease-out-expo active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "bg-blue text-white shadow-[0_8px_24px_-8px_rgba(22,69,245,.55)] hover:bg-blue-deep hover:shadow-[0_12px_28px_-8px_rgba(22,69,245,.65)]",
  secondary: "bg-white text-ink ring-1 ring-line hover:ring-blue/40 hover:text-blue",
  ghost: "text-ink hover:bg-mist",
  danger: "bg-white text-rose ring-1 ring-rose/25 hover:bg-rose hover:text-white",
  success: "bg-signal text-white hover:brightness-110",
  white: "bg-white text-blue hover:bg-sky",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-[13.5px]",
  md: "h-11 px-5 text-[15px]",
  lg: "h-14 px-7 text-[16.5px]",
};

interface Common {
  variant?: Variant;
  size?: Size;
  arrow?: boolean;
  loading?: boolean;
  className?: string;
  children: React.ReactNode;
}

function Inner({ arrow, loading, children }: Pick<Common, "arrow" | "loading" | "children">) {
  return (
    <>
      {loading && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
      {children}
      {arrow && !loading && <ArrowRight className="size-[1.1em] transition-transform duration-300 ease-out-expo group-hover/btn:translate-x-1" aria-hidden />}
    </>
  );
}

export function Button({
  variant = "primary",
  size = "md",
  arrow,
  loading,
  className,
  children,
  ...rest
}: Common & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={clsx(base, variants[variant], sizes[size], className)} disabled={loading || rest.disabled} {...rest}>
      <Inner arrow={arrow} loading={loading}>
        {children}
      </Inner>
    </button>
  );
}

export function ButtonLink({ href, variant = "primary", size = "md", arrow, className, children }: Common & { href: string }) {
  return (
    <Link href={href} className={clsx(base, variants[variant], sizes[size], className)}>
      <Inner arrow={arrow}>{children}</Inner>
    </Link>
  );
}
