"use client";

import { useState } from "react";
import { Megaphone, MonitorPlay } from "lucide-react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { Button, ButtonLink } from "@/components/ui/Button";

type Q = {
  doctorId: string;
  doctorName: string;
  specialty: string;
  serving: { id: string; token: string; patientName: string } | null;
  next: { id: string; token: string; patientName: string }[];
  waiting: number;
};

/** Today's queue per doctor with one big "Call next" button. */
export function QueueBar({ hospitalSlug, refreshKey, onCalled }: { hospitalSlug?: string; refreshKey: number; onCalled: () => void }) {
  const req = useApi<{ queues: Q[] }>("/manage/queue", { k: refreshKey });
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const queues = req.data?.queues ?? [];

  const call = async (q: Q) => {
    setBusy(q.doctorId);
    setError(null);
    try {
      await api(`/manage/doctors/${q.doctorId}/call-next`, { method: "POST" });
      req.reload();
      onCalled();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  if (queues.length === 0 && !hospitalSlug) return null;
  return (
    <div className="mb-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-[11.5px] uppercase tracking-[0.14em] text-muted">Live queue</p>
        {hospitalSlug && (
          <ButtonLink href={`/queue/${hospitalSlug}`} size="sm" variant="secondary">
            <MonitorPlay className="size-4" /> Open TV screen
          </ButtonLink>
        )}
      </div>
      {error && <p className="rounded-xl bg-rose/8 px-4 py-2 text-[13.5px] text-rose">{error}</p>}
      {queues.length === 0 ? (
        <p className="rounded-2xl bg-mist px-4 py-3 text-[14px] text-muted">No tokens in today&apos;s queue yet.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {queues.map((q) => (
            <div key={q.doctorId} className="flex items-center gap-4 rounded-[20px] bg-ink p-4 text-white">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold">{q.doctorName}</p>
                <p className="text-[12px] text-white/60">{q.specialty} · {q.waiting} waiting</p>
                <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.14em] text-white/50">Now serving</p>
                <p className="font-mono text-[34px] font-bold leading-none text-[#8fb0ff]">{q.serving?.token ?? "—"}</p>
                {q.next.length > 0 && <p className="mt-1 truncate text-[12px] text-white/60">Next: {q.next.map((n) => n.token).join(" · ")}</p>}
              </div>
              <Button variant="white" onClick={() => call(q)} loading={busy === q.doctorId} disabled={q.waiting === 0} className="shrink-0">
                <Megaphone className="size-4" /> {q.next[0] ? `Call ${q.next[0].token}` : "Call next"}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
