import { ButtonLink } from "@/components/ui/Button";

export function CtaBand() {
  return (
    <section className="px-3 pb-6 sm:px-5">
      <div className="relative mx-auto max-w-[1400px] overflow-hidden rounded-[36px] bg-blue px-6 py-20 text-center sm:px-12 md:py-28">
        <svg className="absolute inset-x-0 top-1/2 h-40 w-full -translate-y-1/2 opacity-20" viewBox="0 -70 1200 140" preserveAspectRatio="none" aria-hidden>
          <path d="M0 0h420l14-18 14 18h20l10-60 12 110 10-50h24l14-16 14 16h648" fill="none" stroke="white" strokeWidth="2" />
        </svg>
        <h2 className="relative mx-auto max-w-[820px] font-display text-[clamp(2.4rem,5.4vw,4.6rem)] font-extrabold leading-[0.92] tracking-[-0.05em] text-white">
          Your next hospital visit, booked in three taps.
        </h2>
        <div className="relative mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          <ButtonLink href="/hospitals?near=1" size="lg" variant="white" arrow>
            Find hospitals near me
          </ButtonLink>
          <ButtonLink href="/register" size="lg" className="bg-white/10 ring-1 ring-white/30 hover:bg-white/20">
            Create free account
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
