"use client";

import { useApi } from "@/lib/useApi";
import { Empty, Panel } from "./bits";

type Entry = { id: string; actorName: string; action: string; target: string | null; meta: Record<string, unknown> | null; ip: string | null; createdAt: string };

const LABEL: Record<string, string> = {
  "users.view": "Viewed the user list (patient data)",
  "application.approve": "Approved a hospital application",
  "application.reject": "Rejected a hospital application",
  "hospital.update": "Changed a hospital's listing or registry details",
  "doctor.verify": "Verified a doctor's registration number",
  "doctor.unverify": "Removed a doctor's registration check",
  "promotion.create": "Started a promotion",
  "promotion.update": "Changed a promotion",
  "promotion.archive": "Archived a promotion",
  "incident.create": "Logged an incident",
  "incident.update": "Updated an incident",
};

/** Every admin action and every view of patient data, newest first. */
export function AuditLog() {
  const req = useApi<{ entries: Entry[] }>("/admin/audit");
  const rows = req.data?.entries ?? null;
  return (
    <Panel title="Audit log">
      <p className="-mt-2 mb-4 text-[13.5px] text-muted">Every admin action and every view of patient data is recorded here. Entries can&apos;t be edited or deleted from the app.</p>
      {rows === null ? (
        <div className="h-40 animate-pulse rounded-2xl bg-mist" />
      ) : rows.length === 0 ? (
        <Empty title="Nothing logged yet" body="Admin actions appear here as they happen." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[14px]">
            <thead className="text-[12.5px] text-muted">
              <tr className="border-b border-line">
                <th className="py-3 font-medium">When</th>
                <th className="py-3 font-medium">Who</th>
                <th className="py-3 font-medium">What</th>
                <th className="py-3 font-medium">Record</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id} className="border-b border-line last:border-0 align-top">
                  <td className="whitespace-nowrap py-3 font-mono text-[12.5px] text-muted">{new Date(e.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</td>
                  <td className="py-3 font-semibold">{e.actorName}</td>
                  <td className="py-3">{LABEL[e.action] ?? e.action}</td>
                  <td className="py-3 font-mono text-[12px] text-muted">{e.target ?? "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
