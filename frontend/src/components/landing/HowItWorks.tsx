"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll, useTransform } from "motion/react";
import { Check, Clock, MapPin, Star } from "lucide-react";
import { Eyebrow } from "./Reveal";

const STEPS = [
  { title: "Find a hospital near you", body: "We sort hospitals by how far they are from you, with travel time, ratings and the doctors on duty." },
  { title: "Pick a time that suits you", body: "Tap a date, tap a free slot. Booking for your parents or kids? Tap their name." },
  { title: "The hospital confirms", body: "Most bookings are confirmed instantly. Some doctors check each request first; you see the answer live." },
  { title: "Show your token at the desk", body: "Your token number lands on your phone. Walk in at your time and skip the registration queue." },
];

/* ---------- Phone screens ---------- */

function ScreenNearby() {
  const rows = [
    { n: "Gomti Multispeciality", d: "2.3 km · 6 min", r: "4.5" },
    { n: "Sabarmati Care Hospital", d: "4.1 km · 11 min", r: "4.7", s: true },
    { n: "Narmada Mother & Child", d: "4.5 km · 12 min", r: "4.8" },
  ];
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-2xl bg-mist px-3 py-2.5 text-[12px] text-muted">
        <MapPin className="size-3.5 text-blue" /> Near Thaltej, Ahmedabad
      </div>
      {rows.map((r, i) => (
        <motion.div key={r.n} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.08 * i }} className="rounded-2xl bg-white p-3 ring-1 ring-line">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-semibold text-ink">{r.n}</p>
            {r.s && <span className="font-mono text-[9px] uppercase tracking-wider text-muted">Sponsored</span>}
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11.5px] text-muted">
            <span className="font-mono text-blue">{r.d}</span>
            <span className="flex items-center gap-1">
              <Star className="size-3 fill-amber text-amber" />
              {r.r}
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function ScreenSlots() {
  const times = ["09:00", "09:15", "09:30", "09:45", "10:00", "10:15", "10:30", "10:45", "11:00"];
  const off = new Set(["09:15", "10:00", "10:45"]);
  return (
    <div>
      <p className="text-[13px] font-semibold text-ink">Dr. Kavita Shah</p>
      <p className="text-[11.5px] text-muted">Cardiology · ₹900</p>
      <div className="mt-3 flex gap-1.5">
        {["Mon 9", "Tue 10", "Wed 11", "Thu 12"].map((d, i) => (
          <span key={d} className={`flex-1 rounded-xl py-2 text-center text-[11px] font-semibold ${i === 1 ? "bg-ink text-white" : "bg-mist text-ink-2"}`}>
            {d}
          </span>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        {times.map((t, i) => (
          <motion.span
            key={t}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.03 * i }}
            className={`rounded-xl py-2 text-center font-mono text-[11.5px] ${
              t === "10:30" ? "bg-blue text-white shadow-[0_6px_16px_-6px_rgba(22,69,245,.7)]" : off.has(t) ? "bg-mist text-muted/50 line-through" : "bg-white text-ink ring-1 ring-line"
            }`}
          >
            {t}
          </motion.span>
        ))}
      </div>
      <div className="mt-4 rounded-full bg-blue py-2.5 text-center text-[12.5px] font-semibold text-white">Request 10:30 AM</div>
    </div>
  );
}

function ScreenApproval() {
  const steps = [
    { t: "Request sent", s: "Tue 10 Nov, 10:30 AM", done: true },
    { t: "Accepted, token issued", s: "Sabarmati Care front desk", done: true, live: true },
    { t: "Reminder before your visit", s: "By text message", done: false },
  ];
  return (
    <div>
      <p className="text-[13px] font-semibold text-ink">Your booking</p>
      <ol className="mt-4 space-y-0">
        {steps.map((s, i) => (
          <li key={s.t} className="relative flex gap-3 pb-5 last:pb-0">
            {i < steps.length - 1 && <span className={`absolute left-[11px] top-6 h-[calc(100%-18px)] w-0.5 ${s.done ? "bg-blue" : "bg-line"}`} />}
            <motion.span
              initial={s.live ? { scale: 0 } : false}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.3 }}
              className={`relative grid size-6 shrink-0 place-items-center rounded-full ${s.done ? "bg-blue text-white" : "bg-white ring-2 ring-line"}`}
            >
              {s.done ? <Check className="size-3.5" strokeWidth={3} /> : <Clock className="size-3 text-muted" />}
            </motion.span>
            <div>
              <p className={`text-[12.5px] font-semibold ${s.done ? "text-ink" : "text-muted"}`}>{s.t}</p>
              <p className="text-[11px] text-muted">{s.s}</p>
            </div>
          </li>
        ))}
      </ol>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-5 rounded-2xl bg-sky p-3 text-[11.5px] text-blue-deep">
        We&apos;ll text you if anything changes.
      </motion.div>
    </div>
  );
}

function ScreenToken() {
  return (
    <div className="flex h-full flex-col items-center text-center">
      <span className="rounded-full bg-signal/10 px-2.5 py-1 text-[11px] font-semibold text-signal">Confirmed</span>
      <p className="mt-4 font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted">Your token</p>
      <motion.p initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 200, damping: 12 }} className="font-mono text-[64px] font-bold leading-none tracking-tight text-blue">
        K-07
      </motion.p>
      <div className="mt-4 w-full border-t border-dashed border-line pt-4 text-left text-[12px]">
        {[
          ["Doctor", "Dr. Kavita Shah"],
          ["When", "Tue 10 Nov · 10:30 AM"],
          ["Where", "Room 204, 2nd floor"],
          ["Pay", "₹900 at the desk"],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between py-1">
            <span className="text-muted">{k}</span>
            <span className="font-semibold text-ink">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const SCREENS = [ScreenNearby, ScreenSlots, ScreenApproval, ScreenToken];

function Phone({ step }: { step: number }) {
  const Screen = SCREENS[step];
  return (
    <div className="relative mx-auto h-[560px] w-[290px] rounded-[48px] bg-ink p-2.5 shadow-[0_50px_100px_-30px_rgba(10,22,48,.55)]">
      <div className="relative h-full overflow-hidden rounded-[40px] bg-[#fbfcff]">
        <div className="absolute left-1/2 top-2.5 z-10 h-6 w-24 -translate-x-1/2 rounded-full bg-ink" />
        <div className="flex items-center justify-between px-6 pt-3 font-mono text-[10.5px] font-medium text-ink">
          <span>9:41</span>
          <span>5G</span>
        </div>
        <div className="mt-6 px-4">
          <p className="font-display text-[19px] font-extrabold tracking-[-0.04em] text-ink">
            Vital<span className="text-blue">yn</span>
          </p>
        </div>
        <div className="mt-4 h-[440px] px-4">
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }} className="h-full">
              <Screen />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export function HowItWorks() {
  const ref = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const [pct, setPct] = useState(0);
  const bar = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  useMotionValueEvent(scrollYProgress, "change", (p) => {
    setStep(Math.min(STEPS.length - 1, Math.floor(p * STEPS.length)));
    setPct(Math.round(p * 100));
  });

  return (
    <section id="how-it-works" className="relative bg-mist">
      {/* Desktop: pinned, scroll-driven */}
      <div ref={ref} className="relative hidden h-[400vh] md:block">
        <div className="sticky top-0 flex h-dvh items-center overflow-hidden">
          <div className="mx-auto grid w-full max-w-[1240px] grid-cols-12 items-center gap-8 px-5">
            <div className="col-span-6">
              <Eyebrow>How it works</Eyebrow>
              <h2 className="mt-4 max-w-[520px] font-display text-[clamp(2.4rem,4.4vw,3.9rem)] font-extrabold leading-[0.95] tracking-[-0.045em] text-ink">
                From your sofa to the doctor&apos;s room in four taps.
              </h2>
              <ol className="mt-10 space-y-2">
                {STEPS.map((s, i) => {
                  const active = i === step;
                  return (
                    <li key={s.title}>
                      <motion.div
                        animate={{ backgroundColor: active ? "#ffffff" : "rgba(255,255,255,0)" }}
                        className={`rounded-2xl px-5 py-4 transition-shadow ${active ? "shadow-[0_20px_40px_-24px_rgba(10,22,48,.35)] ring-1 ring-line" : ""}`}
                      >
                        <div className="flex items-center gap-4">
                          <span className={`font-mono text-[13px] font-medium ${active ? "text-blue" : "text-muted/60"}`}>Step {i + 1}</span>
                          <span className={`font-display text-[21px] font-bold tracking-[-0.03em] transition-colors ${active ? "text-ink" : "text-muted/70"}`}>{s.title}</span>
                        </div>
                        <motion.div initial={false} animate={{ height: active ? "auto" : 0, opacity: active ? 1 : 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} className="overflow-hidden">
                          <p className="max-w-[440px] pt-2 text-[15.5px] leading-relaxed text-muted [padding-left:calc(13px*4.2+1rem)]">{s.body}</p>
                        </motion.div>
                      </motion.div>
                    </li>
                  );
                })}
              </ol>
            </div>
            <div className="relative col-span-6">
              <div className="absolute inset-0 -z-0 m-auto size-[520px] rounded-full bg-[radial-gradient(circle,rgba(22,69,245,.16),transparent_65%)]" aria-hidden />
              <Phone step={step} />
            </div>
          </div>

          <div className="absolute bottom-8 right-8 flex items-center gap-3 rounded-full bg-white py-2 pl-4 pr-2 text-[13px] text-muted shadow-sm ring-1 ring-line">
            <span>{step < STEPS.length - 1 ? `Next: ${STEPS[step + 1].title}` : "You're all set"}</span>
            <span className="relative h-1.5 w-20 overflow-hidden rounded-full bg-mist">
              <motion.span style={{ width: bar }} className="absolute inset-y-0 left-0 rounded-full bg-blue" />
            </span>
            <span className="w-10 rounded-full bg-ink py-0.5 text-center font-mono text-[11px] text-white">{pct}%</span>
          </div>
        </div>
      </div>

      {/* Mobile: simple stacked steps */}
      <div className="px-5 py-20 md:hidden">
        <Eyebrow>How it works</Eyebrow>
        <h2 className="mt-4 font-display text-[2.4rem] font-extrabold leading-[0.95] tracking-[-0.045em] text-ink">From your sofa to the doctor&apos;s room in four taps.</h2>
        <ol className="mt-10 space-y-14">
          {STEPS.map((s, i) => {
            const Screen = SCREENS[i];
            return (
              <li key={s.title}>
                <p className="font-mono text-[13px] text-blue">Step {i + 1}</p>
                <p className="mt-1 font-display text-[24px] font-bold tracking-[-0.03em]">{s.title}</p>
                <p className="mt-2 text-[15.5px] text-muted">{s.body}</p>
                <div className="mt-5 rounded-[28px] bg-white p-4 ring-1 ring-line">
                  <Screen />
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
