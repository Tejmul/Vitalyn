"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, seg } from "@/lib/api";
import { Logo } from "@/components/ui/Logo";

type Board = { doctorName: string; specialty: string; serving: string | null; next: string[]; waiting: number };

/**
 * Waiting-room TV: "Now serving" per doctor. Tokens only, never patient names.
 * Refreshes every 10 seconds; keeps showing the last good data if a refresh fails.
 */
export default function QueueScreen() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<{ hospital: { name: string }; boards: Board[]; updatedAt: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [clock, setClock] = useState("");

  useEffect(() => {
    let alive = true;
    const load = () =>
      api<{ hospital: { name: string }; boards: Board[]; updatedAt: string }>(`/hospitals/${seg(slug)}/queue`)
        .then((d) => {
          if (!alive) return;
          setData(d);
          setError(null);
        })
        .catch((e: Error) => alive && setError(e.message));
    load();
    const id = setInterval(load, 10_000);
    const tick = () => setClock(new Date().toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }));
    tick();
    const c = setInterval(tick, 15_000);
    return () => {
      alive = false;
      clearInterval(id);
      clearInterval(c);
    };
  }, [slug]);

  return (
    <div className="min-h-dvh bg-ink px-6 py-6 text-white sm:px-10">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Logo inverted href="#" />
          <span className="hidden text-[18px] text-white/60 sm:inline">{data?.hospital.name}</span>
        </div>
        <span className="font-mono text-[28px] text-white/80">{clock}</span>
      </header>
      <h1 className="mt-8 font-display text-[clamp(2rem,4vw,3.4rem)] font-extrabold tracking-[-0.04em]">Now serving</h1>
      {error && !data && <p className="mt-6 text-[18px] text-white/70">{error}</p>}
      {data && data.boards.length === 0 && <p className="mt-6 text-[22px] text-white/60">No tokens called yet today.</p>}
      <div className="mt-8 grid gap-6 lg:grid-cols-2 2xl:grid-cols-3">
        {data?.boards.map((b) => (
          <section key={b.doctorName} className="rounded-[32px] bg-white/[0.06] p-7 ring-1 ring-white/10">
            <p className="text-[24px] font-semibold">{b.doctorName}</p>
            <p className="text-[16px] text-white/55">{b.specialty}</p>
            <p aria-live="polite" className="mt-4 font-mono text-[clamp(4.5rem,9vw,8rem)] font-bold leading-none text-[#8fb0ff]">
              {b.serving ?? "—"}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3 text-[20px]">
              <span className="text-white/50">Next</span>
              {b.next.length === 0 ? (
                <span className="text-white/40">none waiting</span>
              ) : (
                b.next.map((t) => (
                  <span key={t} className="rounded-xl bg-white/10 px-3 py-1 font-mono">
                    {t}
                  </span>
                ))
              )}
            </div>
          </section>
        ))}
      </div>
      <p className="mt-10 text-[15px] text-white/40">Please wait near the OPD when your token is next. Emergencies: go straight to casualty or call 112.</p>
    </div>
  );
}
