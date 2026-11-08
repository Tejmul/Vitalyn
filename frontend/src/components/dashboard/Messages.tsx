"use client";

import { useApi } from "@/lib/useApi";
import { Badge } from "@/components/ui/Badge";
import { Empty, Panel, Stat } from "./bits";

type Status = "QUEUED" | "SENDING" | "SENT" | "FAILED" | "SKIPPED";
type Kind = "CONFIRMED" | "REMINDER" | "REJECTED" | "EXPIRED" | "DOCTOR_LEAVE";
type Report = {
  status: Partial<Record<Status, number>>;
  kinds: Partial<Record<Kind, Partial<Record<Status, number>>>>;
  bookings: number;
  smsPerBooking: number;
  problems: { id: string; kind: Kind; phone: string; status: Status; attempts: number; lastError: string | null; createdAt: string }[];
};

const KIND_LABEL: Record<Kind, string> = {
  CONFIRMED: "Booking confirmed",
  REMINDER: "2-hour reminder",
  REJECTED: "Not accepted",
  EXPIRED: "Request expired",
  DOCTOR_LEAVE: "Doctor on leave",
};

/** Text-message delivery for the last 7 days. */
export function Messages() {
  const req = useApi<Report>("/admin/messages");
  const r = req.data;
  if (!r) return <div className="h-48 animate-pulse rounded-[26px] bg-white ring-1 ring-line" />;
  const n = (s: Status) => r.status[s] ?? 0;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Sent" value={n("SENT")} tone="green" />
        <Stat label="Waiting to send" value={n("QUEUED") + n("SENDING")} tone="blue" />
        <Stat label="Failed" value={n("FAILED")} tone="amber" hint="After 4 tries" />
        <Stat label="Skipped" value={n("SKIPPED")} hint="No template set" />
        <Stat label="SMS per booking" value={r.smsPerBooking} hint={`${r.bookings} bookings this week`} />
      </div>
      <Panel title="By message type · last 7 days">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-[14px]">
            <thead className="text-[12.5px] text-muted">
              <tr className="border-b border-line">
                <th className="py-3 font-medium">Message</th>
                <th className="py-3 text-right font-medium">Sent</th>
                <th className="py-3 text-right font-medium">Waiting</th>
                <th className="py-3 text-right font-medium">Failed</th>
                <th className="py-3 text-right font-medium">Skipped</th>
              </tr>
            </thead>
            <tbody>
              {(Object.keys(KIND_LABEL) as Kind[]).map((k) => {
                const c = r.kinds[k] ?? {};
                return (
                  <tr key={k} className="border-b border-line last:border-0">
                    <td className="py-3 font-semibold">{KIND_LABEL[k]}</td>
                    <td className="py-3 text-right font-mono">{c.SENT ?? 0}</td>
                    <td className="py-3 text-right font-mono">{(c.QUEUED ?? 0) + (c.SENDING ?? 0)}</td>
                    <td className="py-3 text-right font-mono">{c.FAILED ?? 0}</td>
                    <td className="py-3 text-right font-mono">{c.SKIPPED ?? 0}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
      <Panel title="Problems">
        {r.problems.length === 0 ? (
          <Empty title="No failed or skipped messages" body="Everything queued this week was sent." />
        ) : (
          <ul className="divide-y divide-line">
            {r.problems.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-[14.5px] font-semibold">
                    {KIND_LABEL[p.kind]} <span className="font-mono text-[13px] font-normal text-muted">to {p.phone}</span>
                  </p>
                  <p className="text-[13px] text-muted">{p.lastError ?? "Unknown error"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[12px] text-muted">{p.attempts} tries</span>
                  <Badge tone={p.status === "FAILED" ? "red" : "grey"}>{p.status.toLowerCase()}</Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
