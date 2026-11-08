"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ErrorNote, Field, inputClass } from "@/components/ui/Field";
import { Empty, Panel } from "./bits";

type Incident = {
  id: string;
  title: string;
  description: string;
  detectedAt: string;
  affectedPeople: number | null;
  status: "OPEN" | "REPORTED" | "CLOSED";
  reportedToCertInAt: string | null;
  reportedToBoardAt: string | null;
  peopleNotifiedAt: string | null;
  notes: string | null;
};

const fmt = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

/** "Due in 3 h", "Overdue by 2 h", or "Done 9 Nov, 2:10 pm". */
function Deadline({ label, detectedAt, hours, doneAt, now }: { label: string; detectedAt: string; hours: number; doneAt: string | null; now: number }) {
  if (doneAt) return <Badge tone="green">{label} reported {fmt(doneAt)}</Badge>;
  const due = new Date(detectedAt).getTime() + hours * 3600_000;
  const left = Math.round((due - now) / 3600_000);
  return left >= 0 ? <Badge tone="amber">{label} due in {left} h</Badge> : <Badge tone="red">{label} overdue by {-left} h</Badge>;
}

function IncidentRow({ i, deadlines, now, onChange }: { i: Incident; deadlines: { certInHours: number; boardHours: number }; now: number; onChange: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const mark = async (key: string, body: Record<string, unknown>) => {
    setBusy(key);
    await api(`/admin/incidents/${i.id}`, { method: "PATCH", body }).catch(() => {});
    setBusy(null);
    onChange();
  };
  const stamp = new Date().toISOString();
  return (
    <li className="rounded-[18px] bg-[#fafbfe] p-4 ring-1 ring-line">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[15.5px] font-semibold">{i.title}</p>
        <Badge tone={i.status === "OPEN" ? "red" : i.status === "REPORTED" ? "blue" : "grey"}>{i.status.toLowerCase()}</Badge>
      </div>
      <p className="mt-1 text-[13.5px] text-ink-2">{i.description}</p>
      <p className="mt-1 text-[12.5px] text-muted">
        Detected {fmt(i.detectedAt)}
        {i.affectedPeople !== null ? ` · about ${i.affectedPeople} people affected` : ""}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Deadline label="CERT-In" detectedAt={i.detectedAt} hours={deadlines.certInHours} doneAt={i.reportedToCertInAt} now={now} />
        <Deadline label="Data Protection Board" detectedAt={i.detectedAt} hours={deadlines.boardHours} doneAt={i.reportedToBoardAt} now={now} />
        {i.peopleNotifiedAt && <Badge tone="green">People told {fmt(i.peopleNotifiedAt)}</Badge>}
      </div>
      {i.status !== "CLOSED" && (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
          {!i.reportedToCertInAt && (
            <Button size="sm" variant="secondary" loading={busy === "cert"} onClick={() => mark("cert", { reportedToCertInAt: stamp, status: "REPORTED" })}>
              Reported to CERT-In
            </Button>
          )}
          {!i.reportedToBoardAt && (
            <Button size="sm" variant="secondary" loading={busy === "board"} onClick={() => mark("board", { reportedToBoardAt: stamp, status: "REPORTED" })}>
              Reported to the Board
            </Button>
          )}
          {!i.peopleNotifiedAt && (
            <Button size="sm" variant="secondary" loading={busy === "people"} onClick={() => mark("people", { peopleNotifiedAt: stamp })}>
              Affected people told
            </Button>
          )}
          <Button size="sm" variant="ghost" loading={busy === "close"} onClick={() => mark("close", { status: "CLOSED" })}>
            Close incident
          </Button>
        </div>
      )}
    </li>
  );
}

/** Breach and cyber-incident log with the CERT-In (6 h) and DPDP Board (72 h) clocks. */
export function Incidents() {
  const req = useApi<{ incidents: Incident[]; deadlines: { certInHours: number; boardHours: number } }>("/admin/incidents");
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ title: "", description: "", detectedAt: "", affectedPeople: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [now] = useState(() => new Date().getTime());

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await api("/admin/incidents", {
        method: "POST",
        body: { title: f.title, description: f.description, detectedAt: new Date(f.detectedAt).toISOString(), affectedPeople: f.affectedPeople ? Number(f.affectedPeople) : undefined },
      });
      setAdding(false);
      setF({ title: "", description: "", detectedAt: "", affectedPeople: "" });
      req.reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const rows = req.data?.incidents ?? null;
  return (
    <Panel
      title="Incidents & breaches"
      action={
        !adding ? (
          <Button size="sm" variant="danger" onClick={() => setAdding(true)}>
            <AlertTriangle className="size-4" /> Log an incident
          </Button>
        ) : null
      }
    >
      <p className="-mt-2 mb-4 text-[13.5px] text-muted">
        Report cyber incidents to CERT-In within {req.data?.deadlines.certInHours ?? 6} hours of noticing, and personal-data breaches to the Data Protection Board within {req.data?.deadlines.boardHours ?? 72} hours. Clocks start at detection.
      </p>
      {adding && (
        <div className="mb-5 space-y-3 rounded-2xl bg-rose/5 p-4">
          <Field label="What happened, in a few words">
            <input className={inputClass} value={f.title} onChange={(e) => setF((x) => ({ ...x, title: e.target.value }))} placeholder="Desk laptop lost with a logged-in session" />
          </Field>
          <Field label="Details: what data, how many people, what's been done">
            <textarea className={`${inputClass} h-24 py-3`} value={f.description} onChange={(e) => setF((x) => ({ ...x, description: e.target.value }))} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="When was it noticed?">
              <input className={inputClass} type="datetime-local" value={f.detectedAt} onChange={(e) => setF((x) => ({ ...x, detectedAt: e.target.value }))} />
            </Field>
            <Field label="People affected" hint="Best estimate">
              <input className={inputClass} inputMode="numeric" value={f.affectedPeople} onChange={(e) => setF((x) => ({ ...x, affectedPeople: e.target.value.replace(/\D/g, "") }))} />
            </Field>
          </div>
          {error && <ErrorNote>{error}</ErrorNote>}
          <div className="flex gap-2">
            <Button variant="danger" onClick={save} loading={busy} disabled={!f.title || !f.description || !f.detectedAt}>
              Log incident
            </Button>
            <Button variant="ghost" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
      {rows === null ? (
        <div className="h-32 animate-pulse rounded-2xl bg-mist" />
      ) : rows.length === 0 ? (
        <Empty title="No incidents logged" body="If something goes wrong, log it here straight away so the reporting clocks are visible." />
      ) : (
        <ul className="space-y-3">
          {rows.map((i) => (
            <IncidentRow key={i.id} i={i} deadlines={req.data!.deadlines} now={now} onChange={req.reload} />
          ))}
        </ul>
      )}
    </Panel>
  );
}
