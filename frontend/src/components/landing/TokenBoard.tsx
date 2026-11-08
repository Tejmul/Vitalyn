"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

const QUEUE = [
  { token: "K-07", doctor: "Dr. Kavita Shah", room: "Cardiology · Room 204" },
  { token: "R-12", doctor: "Dr. Rohan Mehta", room: "Orthopaedics · Room 118" },
  { token: "M-03", doctor: "Dr. Meera Iyer", room: "Gynaecology · Room 310" },
  { token: "K-08", doctor: "Dr. Kavita Shah", room: "Cardiology · Room 204" },
];

/** The OPD "Now serving" display every Indian patient knows, here as a split-flap. */
export function TokenBoard({ className = "" }: { className?: string }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setI((x) => (x + 1) % QUEUE.length), 2800);
    return () => clearInterval(id);
  }, []);
  const now = QUEUE[i];

  return (
    <div className={`w-[248px] rounded-[22px] bg-ink p-4 text-white shadow-[0_30px_60px_-20px_rgba(10,22,48,.6)] ring-1 ring-white/10 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.16em] text-white/60">
          <span className="relative flex size-2">
            <span className="live-ping absolute inset-0 rounded-full bg-[#3ee6a1]" />
            <span className="relative size-2 rounded-full bg-[#3ee6a1]" />
          </span>
          Now serving
        </span>
        <span className="font-mono text-[10.5px] text-white/40">OPD · 2</span>
      </div>
      <div className="mt-3 flex gap-1.5" aria-live="polite">
        {now.token.split("").map((ch, idx) => (
          <span key={idx} className="relative grid h-[62px] w-[44px] place-items-center overflow-hidden rounded-[9px] bg-white/[0.07] ring-1 ring-white/10 [perspective:300px]">
            <span className="absolute inset-x-0 top-1/2 z-10 h-px bg-black/50" aria-hidden />
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={`${i}-${idx}-${ch}`}
                initial={{ rotateX: -90, opacity: 0 }}
                animate={{ rotateX: 0, opacity: 1 }}
                exit={{ rotateX: 90, opacity: 0 }}
                transition={{ duration: 0.45, delay: idx * 0.07, ease: [0.22, 1, 0.36, 1] }}
                className={`font-mono text-[34px] font-bold leading-none ${ch === "-" ? "text-white/40" : idx === 0 ? "text-[#8fb0ff]" : "text-white"}`}
              >
                {ch}
              </motion.span>
            </AnimatePresence>
          </span>
        ))}
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.3 }} className="mt-3">
          <p className="text-[14px] font-semibold">{now.doctor}</p>
          <p className="text-[12px] text-white/55">{now.room}</p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
