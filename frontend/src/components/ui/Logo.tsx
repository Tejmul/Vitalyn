import Link from "next/link";

/** Vitalyn: the mark is a single heartbeat, the most "vital" sign there is. */
export function Logo({ href = "/", inverted = false }: { href?: string; inverted?: boolean }) {
  const stroke = inverted ? "var(--blue)" : "white";
  return (
    <Link href={href} className="group inline-flex items-center gap-2.5" aria-label="Vitalyn home">
      <span className={`grid size-9 place-items-center rounded-[11px] ${inverted ? "bg-white" : "bg-blue"} transition-transform duration-500 ease-out-expo group-hover:-rotate-6`}>
        <svg viewBox="0 0 24 24" className="size-[22px]" fill="none" aria-hidden>
          <path d="M2.5 13h4.2l1.8-4 3 9 2.6-12 2.2 7h5.2" stroke={stroke} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className={`font-display text-[21px] font-extrabold tracking-[-0.04em] ${inverted ? "text-white" : "text-ink"}`}>
        Vital<span className={inverted ? "text-sky" : "text-blue"}>yn</span>
      </span>
    </Link>
  );
}
