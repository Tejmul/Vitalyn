import { clsx } from "clsx";

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string | null; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between text-[13.5px] font-semibold text-ink-2">
        {label}
        {hint && <span className="text-[12px] font-normal text-muted">{hint}</span>}
      </span>
      {children}
      {error && <span className="mt-1.5 block text-[13px] text-rose">{error}</span>}
    </label>
  );
}

export const inputClass = clsx(
  "h-12 w-full rounded-xl bg-white px-4 text-[15.5px] text-ink ring-1 ring-line outline-none transition placeholder:text-muted/60",
  "focus:ring-2 focus:ring-blue",
);

export function ErrorNote({ children }: { children: React.ReactNode }) {
  return <div role="alert" className="rounded-xl bg-rose/8 px-4 py-3 text-[14px] text-rose ring-1 ring-rose/20">{children}</div>;
}
