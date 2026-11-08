import Image from "next/image";
import { Reveal } from "./Reveal";

export function Trust() {
  return (
    <section className="px-3 sm:px-5">
      <div className="relative mx-auto max-w-[1400px] overflow-hidden rounded-[36px] bg-ink">
        <Image src="/images/trust.jpg" alt="" fill sizes="100vw" className="object-cover opacity-45" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/85 to-ink/20" aria-hidden />
        <div className="relative grid gap-10 px-6 py-20 sm:px-12 md:py-28 lg:grid-cols-2">
          <Reveal>
            <p className="font-deva text-[clamp(2rem,4vw,3rem)] italic leading-tight text-[#8fb0ff]">भरोसा, हर कदम पर।</p>
            <h2 className="mt-3 max-w-[520px] font-display text-[clamp(2rem,4vw,3.2rem)] font-extrabold leading-[0.98] tracking-[-0.045em] text-white">
              Your details go to your doctor, and nobody else.
            </h2>
          </Reveal>
          <Reveal delay={0.1} className="grid content-end gap-6 sm:grid-cols-2">
            {[
              ["Shared with one hospital", "Only the hospital and doctor you book can see your booking."],
              ["Only what's needed", "Name, age and reason for visit. No documents until you choose to add them."],
              ["Verified hospitals", "Every hospital is checked by our team before it can take bookings."],
              ["Clear sponsored labels", "Paid placements are always marked, and never hide closer hospitals."],
            ].map(([t, b]) => (
              <div key={t} className="border-t border-white/15 pt-4">
                <p className="font-display text-[17px] font-bold text-white">{t}</p>
                <p className="mt-1.5 text-[14px] leading-relaxed text-white/60">{b}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </div>
    </section>
  );
}
