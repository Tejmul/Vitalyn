import { clsx } from "clsx";

const tones = {
  amber: "bg-amber/10 text-amber ring-amber/20",
  blue: "bg-blue/8 text-blue ring-blue/20",
  green: "bg-signal/10 text-signal ring-signal/20",
  grey: "bg-ink/5 text-muted ring-ink/10",
  red: "bg-rose/10 text-rose ring-rose/20",
  ink: "bg-ink text-white ring-ink",
};

export function Badge({ tone = "grey", dot, children, className }: { tone?: keyof typeof tones; dot?: boolean; children: React.ReactNode; className?: string }) {
  return (
    <span className={clsx("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-semibold ring-1 ring-inset", tones[tone], className)}>
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}

/** Paid placements are always labelled. */
export function SponsoredTag({ className }: { className?: string }) {
  return (
    <span className={clsx("inline-flex items-center rounded-full bg-white/90 px-2 py-0.5 font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-ink-2 ring-1 ring-line backdrop-blur", className)}>
      Sponsored
    </span>
  );
}
