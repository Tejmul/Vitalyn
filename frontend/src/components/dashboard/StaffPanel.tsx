"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import type { Doctor } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ErrorNote, Field, inputClass } from "@/components/ui/Field";
import { Panel } from "./bits";

type Staff = {
  id: string;
  name: string;
  phone: string | null;
  role: "HOSPITAL" | "DOCTOR";
  staffRole: "MANAGER" | "RECEPTION" | null;
  disabledAt: string | null;
  doctor: { id: string; name: string } | null;
};
type Kind = "RECEPTION" | "MANAGER" | "DOCTOR";

const KIND: Record<Kind, { label: string; help: string }> = {
  RECEPTION: { label: "Reception", help: "Daily desk work: queue, accept/reject, arrived, paid, walk-ins" },
  MANAGER: { label: "Manager", help: "Everything, including doctors, schedules, hospital details and staff" },
  DOCTOR: { label: "Doctor", help: "Their own patients: accept or reject requests, mark leave" },
};

function AddStaff({ onAdded, onCancel }: { onAdded: () => void; onCancel: () => void }) {
  const doctorsReq = useApi<{ doctors: Doctor[] }>("/manage/doctors");
  const [kind, setKind] = useState<Kind>("RECEPTION");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const free = (doctorsReq.data?.doctors ?? []).filter((d) => d.active);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await api("/manage/staff", { method: "POST", body: { kind, name, phone, doctorId: kind === "DOCTOR" ? doctorId : undefined } });
      onAdded();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mb-4 space-y-3 rounded-2xl bg-mist p-4">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(KIND) as Kind[]).map((k) => (
          <button key={k} type="button" onClick={() => setKind(k)} aria-pressed={kind === k} className={`h-9 rounded-full px-4 text-[13.5px] font-semibold ${kind === k ? "bg-blue text-white" : "bg-white text-ink-2 ring-1 ring-line"}`}>
            {KIND[k].label}
          </button>
        ))}
      </div>
      <p className="text-[13px] text-muted">{KIND[kind].help}</p>
      {kind === "DOCTOR" && (
        <div>
          <p className="mb-2 text-[13px] font-semibold text-ink-2">Which doctor is this login for?</p>
          <div className="flex flex-wrap gap-2">
            {free.map((d) => (
              <button key={d.id} type="button" onClick={() => setDoctorId(d.id)} aria-pressed={doctorId === d.id} className={`h-9 rounded-full px-3.5 text-[13px] font-semibold ${doctorId === d.id ? "bg-ink text-white" : "bg-white ring-1 ring-line"}`}>
                {d.name}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name">
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Their mobile" hint="They log in with a code sent here">
          <input className={inputClass} type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98765 43210" />
        </Field>
      </div>
      {error && <ErrorNote>{error}</ErrorNote>}
      <div className="flex gap-2">
        <Button onClick={save} loading={busy} disabled={name.trim().length < 2 || phone.replace(/\D/g, "").length < 10 || (kind === "DOCTOR" && !doctorId)}>
          Add {KIND[kind].label.toLowerCase()}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

/** Managers add and remove the people who use the hospital's Vitalyn desk. */
export function StaffPanel() {
  const req = useApi<{ staff: Staff[] }>("/manage/staff");
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggle = async (s: Staff) => {
    if (!s.disabledAt && !window.confirm(`Turn off ${s.name}'s access? They'll be logged out straight away.`)) return;
    setBusy(s.id);
    setError(null);
    try {
      await api(`/manage/staff/${s.id}`, { method: "PATCH", body: { disabled: !s.disabledAt } });
      req.reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const label = (s: Staff) => (s.role === "DOCTOR" ? "Doctor" : s.staffRole === "MANAGER" ? "Manager" : "Reception");

  return (
    <Panel
      title="Staff"
      action={
        !adding ? (
          <Button size="sm" onClick={() => setAdding(true)}>
            <UserPlus className="size-4" /> Add staff
          </Button>
        ) : null
      }
    >
      {adding && (
        <AddStaff
          onAdded={() => {
            setAdding(false);
            req.reload();
          }}
          onCancel={() => setAdding(false)}
        />
      )}
      {error && (
        <div className="mb-3">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}
      <ul className="divide-y divide-line">
        {(req.data?.staff ?? []).map((s) => (
          <li key={s.id} className={`flex flex-wrap items-center justify-between gap-3 py-3 ${s.disabledAt ? "opacity-60" : ""}`}>
            <div>
              <p className="flex flex-wrap items-center gap-2 text-[15px] font-semibold">
                {s.name}
                <Badge tone={s.role === "DOCTOR" ? "green" : s.staffRole === "MANAGER" ? "blue" : "grey"}>{label(s)}</Badge>
                {s.disabledAt && <Badge tone="red">Access off</Badge>}
              </p>
              <p className="font-mono text-[12.5px] text-muted">{s.phone}</p>
            </div>
            <Button size="sm" variant={s.disabledAt ? "secondary" : "danger"} onClick={() => toggle(s)} loading={busy === s.id}>
              {s.disabledAt ? "Turn access on" : "Turn access off"}
            </Button>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
