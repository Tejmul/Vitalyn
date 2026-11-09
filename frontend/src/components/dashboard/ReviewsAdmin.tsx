"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Stars } from "@/components/app/Reviews";
import { Empty, Panel } from "./bits";

type AdminReview = { id: string; rating: number; comment: string | null; displayName: string; hidden: boolean; hiddenReason: string | null; createdAt: string; hospital: { name: string; city: string } };

const REASONS = ["Abusive language", "Contains personal or medical details", "Not about this visit", "Spam or advertising"];

/** Review moderation: hide (with a reason) or restore. Ratings recalculate automatically. */
export function ReviewsAdmin() {
  const req = useApi<{ reviews: AdminReview[] }>("/admin/reviews");
  const [hiding, setHiding] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const set = async (id: string, hidden: boolean, reason?: string) => {
    setBusy(id);
    await api(`/admin/reviews/${id}`, { method: "PATCH", body: { hidden, reason } }).catch(() => {});
    setBusy(null);
    setHiding(null);
    req.reload();
  };
  const rows = req.data?.reviews ?? null;
  return (
    <Panel title="Reviews">
      <p className="-mt-2 mb-4 text-[13.5px] text-muted">Every review comes from a visit marked Arrived. Hide only reviews that break the rules; hospitals can&apos;t remove reviews themselves.</p>
      {rows === null ? (
        <div className="h-32 animate-pulse rounded-2xl bg-mist" />
      ) : rows.length === 0 ? (
        <Empty title="No reviews yet" body="Reviews appear here as patients rate their visits." />
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id} className={`rounded-[18px] bg-[#fafbfe] p-4 ring-1 ring-line ${r.hidden ? "opacity-60" : ""}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex flex-wrap items-center gap-2">
                  <Stars value={r.rating} /> <b>{r.displayName}</b> <span className="text-[13px] text-muted">on {r.hospital.name}, {r.hospital.city}</span>
                  {r.hidden && <Badge tone="grey">Hidden: {r.hiddenReason}</Badge>}
                </span>
                {r.hidden ? (
                  <Button size="sm" variant="secondary" onClick={() => set(r.id, false)} loading={busy === r.id}>
                    Restore
                  </Button>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => setHiding(hiding === r.id ? null : r.id)}>
                    Hide
                  </Button>
                )}
              </div>
              {r.comment && <p className="mt-2 text-[14px] text-ink-2">{r.comment}</p>}
              {hiding === r.id && (
                <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
                  {REASONS.map((reason) => (
                    <Button key={reason} size="sm" variant="danger" onClick={() => set(r.id, true, reason)} loading={busy === r.id}>
                      {reason}
                    </Button>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
