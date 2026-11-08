const ITEMS = ["Cardiology", "Paediatrics", "Orthopaedics", "Gynaecology", "Neurology", "Dermatology", "ENT", "Ophthalmology", "Nephrology", "Oncology", "Physiotherapy", "Endocrinology"];

export function Marquee() {
  const row = (
    <div className="flex shrink-0 items-center gap-8 pr-8" aria-hidden>
      {ITEMS.map((s) => (
        <span key={s} className="flex items-center gap-8 font-display text-[clamp(1.6rem,3vw,2.4rem)] font-bold tracking-[-0.04em] text-ink/85">
          {s}
          <svg viewBox="0 0 24 24" className="size-5 text-blue" aria-hidden>
            <path d="M12 4v16M4 12h16" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
          </svg>
        </span>
      ))}
    </div>
  );
  return (
    <section className="marquee relative overflow-hidden border-y border-line bg-white py-6" aria-label="Specialities available">
      <p className="sr-only">Specialities: {ITEMS.join(", ")}</p>
      <div className="marquee-track flex w-max">
        {row}
        {row}
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-white" aria-hidden />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-white" aria-hidden />
    </section>
  );
}
