"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { HospitalEvent } from "@/lib/types";
import { EVENT_TYPE } from "@/lib/format";
import { Eyebrow, Reveal } from "./Reveal";

export function EventCard({ e, showHospital = true }: { e: HospitalEvent; showHospital?: boolean }) {
  const s = new Date(e.startsAt);
  const t = (x: Date) => x.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
  return (
    <article className="flex h-full overflow-hidden rounded-[24px] bg-white ring-1 ring-line">
      <div className="flex w-[92px] shrink-0 flex-col items-center justify-center border-r border-dashed border-line bg-sky/60 py-5">
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-blue">{s.toLocaleDateString("en-IN", { month: "short" })}</span>
        <span className="font-display text-[44px] font-extrabold leading-none tracking-[-0.05em] text-ink">{s.getDate()}</span>
        <span className="mt-1 text-[12px] font-medium text-muted">{s.toLocaleDateString("en-IN", { weekday: "short" })}</span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-mist px-2.5 py-1 text-[11.5px] font-semibold text-ink-2">{EVENT_TYPE[e.type]}</span>
          {e.isFree && <span className="rounded-full bg-signal/10 px-2.5 py-1 text-[11.5px] font-semibold text-signal">Free</span>}
        </div>
        <h3 className="mt-3 font-display text-[18px] font-bold leading-snug tracking-[-0.02em] text-ink">{e.title}</h3>
        <p className="mt-1.5 line-clamp-2 text-[13.5px] text-muted">{e.description}</p>
        <p className="mt-3 font-mono text-[12px] text-ink-2">
          {t(s)} – {t(new Date(e.endsAt))} · {e.venue}
        </p>
        {showHospital && e.hospital && (
          <Link href={`/hospitals/${e.hospital.slug}`} className="mt-auto pt-4 text-[14px] font-semibold text-blue hover:underline">
            {e.hospital.name}, {e.hospital.city} →
          </Link>
        )}
      </div>
    </article>
  );
}

export function Events() {
  const [events, setEvents] = useState<HospitalEvent[] | null>(null);
  useEffect(() => {
    api<{ events: HospitalEvent[] }>("/events", { query: { limit: 6 } })
      .then((r) => setEvents(r.events))
      .catch(() => setEvents([]));
  }, []);

  if (events && events.length === 0) return null;

  return (
    <section id="events" className="bg-mist py-24 md:py-32">
      <div className="mx-auto max-w-[1240px] px-5">
        <Reveal>
          <Eyebrow>Happening at hospitals</Eyebrow>
          <h2 className="mt-4 max-w-[700px] font-display text-[clamp(2.2rem,4.4vw,3.6rem)] font-extrabold leading-[0.95] tracking-[-0.045em]">
            Free camps, drives and doctor talks this month.
          </h2>
        </Reveal>
        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {(events ?? []).map((e, i) => (
            <Reveal key={e.id} delay={0.05 * i}>
              <EventCard e={e} />
            </Reveal>
          ))}
          {events === null && Array.from({ length: 3 }, (_, i) => <div key={i} className="h-[210px] animate-pulse rounded-[24px] bg-white" />)}
        </div>
      </div>
    </section>
  );
}
