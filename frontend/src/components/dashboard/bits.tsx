import { clsx } from "clsx";
import { Badge } from "@/components/ui/Badge";
import { STATUS } from "@/lib/format";
import type { AppointmentStatus } from "@/lib/types";

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  const s = STATUS[status];
  return (
    <Badge tone={s.tone} dot>
      {s.label}
    </Badge>
  );
}

export function Stat({ label, value, tone = "ink", hint }: { label: string; value: number | string; tone?: "ink" | "blue" | "amber" | "green"; hint?: string }) {
  const color = { ink: "text-ink", blue: "text-blue", amber: "text-amber", green: "text-signal" }[tone];
  return (
    <div className="rounded-[22px] bg-white p-5 ring-1 ring-line">
      <p className="text-[13.5px] font-medium text-muted">{label}</p>
      <p className={clsx("mt-1 font-display text-[38px] font-extrabold leading-none tracking-[-0.05em]", color)}>{value}</p>
      {hint && <p className="mt-2 text-[12.5px] text-muted">{hint}</p>}
    </div>
  );
}

export function Panel({ title, action, children, className }: { title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={clsx("rounded-[26px] bg-white p-5 ring-1 ring-line sm:p-6", className)}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-display text-[20px] font-bold tracking-[-0.03em]">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Empty({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-mist px-5 py-8 text-center">
      <p className="font-display text-[17px] font-bold">{title}</p>
      <p className="mt-1 text-[14px] text-muted">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** A row of big pill buttons that behave like tabs. */
export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string; count?: number }[] }) {
  return (
    <div className="flex flex-wrap gap-2" role="tablist">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={on}
            onClick={() => onChange(o.value)}
            className={clsx("inline-flex h-10 items-center gap-2 rounded-full px-4 text-[14px] font-semibold transition", on ? "bg-ink text-white" : "bg-white text-ink-2 ring-1 ring-line hover:ring-ink/30")}
          >
            {o.label}
            {o.count !== undefined && <span className={clsx("rounded-full px-1.5 font-mono text-[11.5px]", on ? "bg-white/15" : "bg-mist")}>{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
