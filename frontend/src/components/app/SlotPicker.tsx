"use client";

import { useMemo } from "react";
import { useApi } from "@/lib/useApi";
import { nextDays } from "@/lib/format";

type Slot = { time: string; available: boolean };

/** Day buttons + time buttons. Off days and leave days are disabled. */
export function SlotPicker({
  doctorId,
  workingDays,
  leaveDates = [],
  date,
  time,
  onDate,
  onTime,
  exclude,
}: {
  doctorId: string;
  workingDays?: number[];
  leaveDates?: string[];
  date: string;
  time: string | null;
  onDate: (d: string) => void;
  onTime: (t: string) => void;
  /** a slot to show as "current" (e.g. when rescheduling) */
  exclude?: { date: string; time: string };
}) {
  const days = useMemo(() => nextDays(7), []);
  const req = useApi<{ slots: Slot[]; onLeave: boolean }>(`/hospitals/doctors/${doctorId}/slots`, { date });
  const slots = req.error ? [] : (req.data?.slots ?? null);
  const free = slots?.filter((s) => s.available).length ?? 0;

  return (
    <div>
      <p className="text-[13.5px] font-semibold text-ink-2">Pick a day</p>
      <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
        {days.map((d) => {
          const dow = new Date(`${d}T00:00:00`).getDay();
          const off = (workingDays && !workingDays.includes(dow)) || leaveDates.includes(d);
          const on = d === date;
          return (
            <button
              key={d}
              disabled={off}
              onClick={() => onDate(d)}
              title={leaveDates.includes(d) ? "Doctor on leave" : undefined}
              className={`flex h-16 w-[62px] shrink-0 flex-col items-center justify-center rounded-2xl text-[12px] font-semibold transition disabled:opacity-35 ${on ? "bg-ink text-white" : "bg-mist text-ink-2 hover:bg-sky"}`}
            >
              <span>{new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short" })}</span>
              <span className="font-display text-[20px] font-bold leading-none">{new Date(`${d}T00:00:00`).getDate()}</span>
            </button>
          );
        })}
      </div>

      <p className="mt-5 flex justify-between text-[13.5px] font-semibold text-ink-2">
        Pick a time
        {slots && <span className="font-normal text-muted">{free} free</span>}
      </p>
      <div className="mt-2 grid grid-cols-4 gap-2">
        {slots === null ? (
          Array.from({ length: 8 }, (_, i) => <span key={i} className="h-10 animate-pulse rounded-xl bg-mist" />)
        ) : req.data?.onLeave ? (
          <p className="col-span-4 rounded-xl bg-mist p-3 text-[13.5px] text-muted">The doctor is on leave this day. Try another day.</p>
        ) : slots.length === 0 ? (
          <p className="col-span-4 rounded-xl bg-mist p-3 text-[13.5px] text-muted">The doctor isn&apos;t in on this day. Try another day.</p>
        ) : free === 0 ? (
          <p className="col-span-4 rounded-xl bg-mist p-3 text-[13.5px] text-muted">All slots on this day are taken. Try another day.</p>
        ) : (
          slots.map((s) => {
            const current = exclude?.date === date && exclude.time === s.time;
            return (
              <button
                key={s.time}
                disabled={!s.available}
                onClick={() => onTime(s.time)}
                className={`h-10 rounded-xl font-mono text-[12.5px] transition disabled:bg-mist disabled:text-muted/40 ${current ? "" : "disabled:line-through"} ${
                  time === s.time ? "bg-blue text-white shadow-[0_6px_16px_-6px_rgba(22,69,245,.7)]" : "bg-white text-ink ring-1 ring-line hover:ring-blue/50"
                } ${current ? "!bg-sky !text-blue" : ""}`}
              >
                {s.time}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
