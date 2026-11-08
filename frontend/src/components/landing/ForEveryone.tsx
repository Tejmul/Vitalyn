import Image from "next/image";
import { Check } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { Eyebrow, Reveal } from "./Reveal";

const DESKS = [
  {
    who: "For patients and families",
    title: "Book for yourself, your parents or your kids.",
    img: "/images/bharosa.jpg",
    alt: "Two doctors comforting an elderly patient in a wheelchair",
    points: ["See distance and travel time to every hospital", "Know the doctor's fee before you go", "Get your token on your phone"],
    cta: { href: "/hospitals", label: "Find a hospital" },
  },
  {
    who: "For hospitals",
    id: "for-hospitals",
    title: "A calm front desk, even on a Monday morning.",
    img: "/images/care-family.jpg",
    alt: "A doctor and nurse with a smiling patient",
    points: ["Approve, confirm or reschedule with one button", "Tokens are numbered for you, per doctor, per day", "Post health camps and events to nearby patients"],
    cta: { href: "/list-your-hospital", label: "List your hospital" },
  },
  {
    who: "For doctors",
    title: "Say yes to the patients you can see.",
    img: "/images/doctor-phone.jpg",
    alt: "A doctor checking appointments on a phone",
    points: ["Review every request before it's confirmed", "Turn on auto-approve for routine slots", "See your day's queue at a glance"],
    cta: { href: "/login", label: "Doctor log in" },
  },
];

export function ForEveryone() {
  return (
    <section className="mx-auto max-w-[1240px] px-5 py-24 md:py-32">
      <Reveal>
        <Eyebrow>One app, three desks</Eyebrow>
        <h2 className="mt-4 max-w-[760px] font-display text-[clamp(2.2rem,4.4vw,3.6rem)] font-extrabold leading-[0.95] tracking-[-0.045em]">
          The patient, the hospital and the doctor see the same booking.
        </h2>
      </Reveal>
      <div className="mt-14 grid gap-5 lg:grid-cols-3">
        {DESKS.map((d, i) => (
          <Reveal key={d.who} delay={0.08 * i}>
            <article id={d.id} className="group flex h-full scroll-mt-28 flex-col overflow-hidden rounded-[30px] bg-white ring-1 ring-line">
              <div className="relative aspect-[5/4] overflow-hidden">
                <Image src={d.img} alt={d.alt} fill sizes="(max-width: 1024px) 100vw, 400px" className="object-cover transition-transform duration-1000 ease-out-expo group-hover:scale-105" />
                <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1.5 text-[12.5px] font-semibold text-ink backdrop-blur">{d.who}</span>
              </div>
              <div className="flex flex-1 flex-col p-6">
                <h3 className="font-display text-[23px] font-bold leading-tight tracking-[-0.03em] text-ink">{d.title}</h3>
                <ul className="mt-5 space-y-3">
                  {d.points.map((p) => (
                    <li key={p} className="flex gap-3 text-[15px] text-ink-2">
                      <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-sky text-blue">
                        <Check className="size-3" strokeWidth={3} />
                      </span>
                      {p}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-7">
                  <ButtonLink href={d.cta.href} variant={i === 0 ? "primary" : "secondary"} arrow>
                    {d.cta.label}
                  </ButtonLink>
                </div>
              </div>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
