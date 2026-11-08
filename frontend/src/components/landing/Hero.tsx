"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform } from "motion/react";
import { CalendarHeart, CheckCircle2, MapPin, ArrowDown } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { TokenBoard } from "./TokenBoard";

const ease = [0.22, 1, 0.36, 1] as const;

/** One heartbeat, repeated across the width. Drawn on load, then a blip travels along it. */
const BEAT = "h70 l10 -14 l10 14 h18 l8 -64 l10 108 l9 -44 h20 l14 -18 l14 18 h97";
const PULSE = `M0 0 ${Array.from({ length: 6 }, () => BEAT).join(" ")}`;

function PulseLine() {
  return (
    <svg className="pointer-events-none absolute left-0 top-[46%] h-[160px] w-[180%] -translate-y-1/2 md:w-full" viewBox="0 -70 1680 140" preserveAspectRatio="none" aria-hidden>
      <motion.path
        d={PULSE}
        fill="none"
        stroke="var(--blue)"
        strokeOpacity=".14"
        strokeWidth="2"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 2.4, ease: "easeInOut", delay: 0.2 }}
      />
      <motion.path
        d={PULSE}
        fill="none"
        stroke="var(--blue)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="0.05 0.95"
        pathLength={1}
        initial={{ strokeDashoffset: 0.05, opacity: 0 }}
        animate={{ strokeDashoffset: -0.95, opacity: [0, 0.55, 0.55, 0] }}
        transition={{ duration: 5.5, ease: "linear", repeat: Infinity, delay: 2.4 }}
      />
    </svg>
  );
}

function Toast({ icon, title, body, className, delay, float }: { icon: React.ReactNode; title: string; body: string; className: string; delay: number; float: number }) {
  return (
    <motion.div
      className={`absolute z-20 ${className}`}
      initial={{ opacity: 0, scale: 0.85, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.7, delay, ease }}
    >
      <motion.div
        animate={{ y: [0, -9, 0] }}
        transition={{ duration: float, repeat: Infinity, ease: "easeInOut", delay: delay + 0.6 }}
        className="flex w-max max-w-[290px] items-start gap-3 rounded-2xl bg-white/95 p-3 pr-4 shadow-[0_18px_40px_-18px_rgba(10,22,48,.35)] ring-1 ring-line backdrop-blur"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-sky text-blue">{icon}</span>
        <span>
          <span className="block text-[13.5px] font-semibold leading-snug text-ink">{title}</span>
          <span className="block text-[12px] text-muted">{body}</span>
        </span>
      </motion.div>
    </motion.div>
  );
}

const WORDS_1 = ["Your", "OPD"];

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const photoY = useTransform(scrollYProgress, [0, 1], [0, 90]);
  const photoScale = useTransform(scrollYProgress, [0, 1], [1, 1.06]);
  const copyY = useTransform(scrollYProgress, [0, 1], [0, -40]);
  const copyOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0.2]);

  return (
    <section ref={ref} id="home" className="ecg-paper relative overflow-hidden pb-16 pt-28 sm:pt-32 lg:pb-24">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_75%_40%,rgba(22,69,245,.10),transparent_70%)]" aria-hidden />
      <PulseLine />

      <div className="relative mx-auto grid max-w-[1240px] items-center gap-12 px-5 lg:grid-cols-12 lg:gap-6">
        {/* Copy */}
        <motion.div style={{ y: copyY, opacity: copyOpacity }} className="lg:col-span-7">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease }}
            className="inline-flex items-center gap-2 rounded-full bg-white/80 py-1.5 pl-2 pr-3.5 text-[13px] font-medium text-ink-2 ring-1 ring-line backdrop-blur"
          >
            <span className="rounded-full bg-blue px-2 py-0.5 font-mono text-[10.5px] font-medium uppercase tracking-[0.1em] text-white">Free</span>
            For patients in 6 cities, more coming
          </motion.p>

          <h1 className="mt-6 font-display text-[clamp(3.1rem,7.6vw,6.9rem)] font-extrabold leading-[0.9] tracking-[-0.055em] text-ink">
            <span className="block">
              {WORDS_1.map((w, i) => (
                <span key={w} className="inline-block overflow-hidden pb-[0.08em] align-bottom">
                  <motion.span className="inline-block" initial={{ y: "105%" }} animate={{ y: 0 }} transition={{ duration: 0.9, delay: 0.1 + i * 0.08, ease }}>
                    {w}&nbsp;
                  </motion.span>
                </span>
              ))}
              {/* The ticket: the word "token" set as the slip you get at the counter */}
              <motion.span
                className="relative inline-flex items-stretch rounded-[0.16em] bg-blue pb-[0.06em] pl-[0.16em] text-white shadow-[0_0.2em_0.5em_-0.2em_rgba(22,69,245,.6)]"
                initial={{ rotate: 8, scale: 0.6, opacity: 0 }}
                animate={{ rotate: -3, scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 180, damping: 14, delay: 0.45 }}
              >
                token,
                {/* perforated stub, like the slip from the OPD counter */}
                <span className="ml-[0.12em] flex w-[0.42em] flex-col items-center justify-center border-l-[0.035em] border-dashed border-white/50" aria-hidden>
                  <span className="font-mono text-[0.13em] font-medium leading-none tracking-[0.1em] text-white/80 [writing-mode:vertical-rl]">NO. 07</span>
                </span>
              </motion.span>
            </span>
            {["before you", "leave home."].map((line, i) => (
              <span key={line} className="block overflow-hidden pb-[0.06em]">
                <motion.span className="block" initial={{ y: "105%" }} animate={{ y: 0 }} transition={{ duration: 0.9, delay: 0.28 + i * 0.1, ease }}>
                  {line}
                </motion.span>
              </span>
            ))}
          </h1>

          <motion.p
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.9, ease }}
            className="mt-5 flex flex-col gap-1 font-deva sm:flex-row sm:items-baseline sm:gap-3 text-[clamp(1.35rem,2.4vw,1.8rem)] italic text-blue"
          >
            लाइन में नहीं, ऑनलाइन।
            <span className="font-sans text-[13px] not-italic text-muted">Not in the queue. Online.</span>
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 1, ease }}
            className="mt-6 max-w-[540px] text-[17.5px] leading-relaxed text-muted"
          >
            See hospitals near you and how far they are. Pick a time, and your token arrives on your phone once the doctor says yes. Pay at the hospital as usual.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 1.1, ease }}
            className="mt-8 flex flex-col gap-3 sm:flex-row"
          >
            <ButtonLink href="/hospitals?near=1" size="lg" arrow>
              Find hospitals near me
            </ButtonLink>
            <ButtonLink href="#for-hospitals" size="lg" variant="secondary">
              I run a hospital
            </ButtonLink>
          </motion.div>
        </motion.div>

        {/* Visual */}
        <div className="relative mx-auto w-full max-w-[460px] lg:col-span-5 lg:max-w-none">
          <motion.div
            initial={{ opacity: 0, scale: 1.06, clipPath: "inset(12% 12% 12% 12% round 40px)" }}
            animate={{ opacity: 1, scale: 1, clipPath: "inset(0% 0% 0% 0% round 36px)" }}
            transition={{ duration: 1.3, delay: 0.15, ease }}
            className="relative aspect-[4/5] overflow-hidden rounded-[36px] bg-sky shadow-[0_40px_80px_-30px_rgba(22,69,245,.45)]"
          >
            <motion.div style={{ y: photoY, scale: photoScale }} className="absolute -inset-y-12 inset-x-0">
              <Image src="/images/hero-care.jpg" alt="A nurse checking on a smiling young girl in a hospital bed" fill priority sizes="(max-width: 1024px) 90vw, 520px" className="object-cover object-[86%_40%]" quality={90} />
            </motion.div>
            <div className="absolute inset-0 bg-gradient-to-t from-ink/35 via-transparent to-transparent" aria-hidden />
          </motion.div>

          <Toast
            className="-right-2 top-8 sm:-right-8"
            delay={1.2}
            float={5}
            icon={<CheckCircle2 className="size-[18px]" />}
            title="Dr. Mehta approved your slot"
            body="Tue, 11:15 AM · Orthopaedics"
          />
          <Toast className="-left-3 top-[38%] sm:-left-12" delay={1.4} float={6} icon={<MapPin className="size-[18px]" />} title="Sabarmati Care · 2.3 km" body="About 11 min by road" />
          <Toast
            className="-right-2 bottom-24 sm:-right-10"
            delay={1.6}
            float={5.5}
            icon={<CalendarHeart className="size-[18px]" />}
            title="Free heart camp this Saturday"
            body="ECG + BP check · 9 AM to 2 PM"
          />
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 1, ease }} className="absolute -bottom-8 -left-2 z-30 sm:-left-10">
            <TokenBoard />
          </motion.div>
        </div>
      </div>

      <motion.a
        href="#how-it-works"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className="relative mx-auto mt-20 hidden w-max items-center gap-2 text-[13px] font-medium text-muted hover:text-blue lg:flex"
      >
        See how it works
        <motion.span animate={{ y: [0, 4, 0] }} transition={{ duration: 1.6, repeat: Infinity }}>
          <ArrowDown className="size-4" />
        </motion.span>
      </motion.a>
    </section>
  );
}
