"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import type { Promotion } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ErrorNote, Field, inputClass } from "@/components/ui/Field";
import { Panel, Segmented, Stat } from "./bits";
import { Applications } from "./Applications";

type Overview = { counts: { users: number; hospitals: number; doctors: number; appointments: number; pending: number; activePromotions: number; applications: number } };
type AdminHospital = {
  id: string;
  name: string;
  city: string;
  slug: string;
  verified: boolean;
  registrationNo: string | null;
  hfrId: string | null;
  _count: { doctors: number; appointments: number; events: number };
  stats: { cancelled: number; noShow: number; expired: number; arrived: number };
};
type AdminUser = { id: string; name: string; email: string; username: string; phone: string | null; role: string; createdAt: string; hospital: { name: string } | null };

const today = () => new Date().toISOString().slice(0, 10);
const plusDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

function promoState(p: Promotion) {
  const now = Date.now();
  if (!p.active) return { label: "Paused", tone: "grey" as const };
  if (new Date(p.startsAt).getTime() > now) return { label: "Scheduled", tone: "blue" as const };
  if (new Date(p.endsAt).getTime() < now) return { label: "Ended", tone: "grey" as const };
  return { label: "Live", tone: "green" as const };
}

export function AdminDashboard() {
  const [ov, setOv] = useState<Overview | null>(null);
  const [tab, setTab] = useState<"applications" | "promotions" | "hospitals" | "users">("promotions");

  const loadOv = useCallback(() => {
    api<Overview>("/admin/overview").then(setOv).catch(() => {});
  }, []);
  useEffect(loadOv, [loadOv]);

  return (
    <div className="space-y-8">
      <div>
        <p className="font-mono text-[11.5px] uppercase tracking-[0.14em] text-blue">Platform admin</p>
        <h1 className="mt-1 font-display text-[clamp(1.9rem,4vw,2.6rem)] font-extrabold leading-none tracking-[-0.045em]">Vitalyn control room</h1>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Patients" value={ov?.counts.users ?? "–"} />
        <Stat label="Hospitals" value={ov?.counts.hospitals ?? "–"} />
        <Stat label="Doctors" value={ov?.counts.doctors ?? "–"} />
        <Stat label="Bookings" value={ov?.counts.appointments ?? "–"} />
        <Stat label="Waiting" value={ov?.counts.pending ?? "–"} tone="amber" />
        <Stat label="Live promotions" value={ov?.counts.activePromotions ?? "–"} tone="blue" />
      </div>
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: "applications", label: "Applications", count: ov?.counts.applications },
          { value: "promotions", label: "Promotions" },
          { value: "hospitals", label: "Hospitals" },
          { value: "users", label: "Users" },
        ]}
      />
      {tab === "applications" && <Applications onChange={loadOv} />}
      {tab === "promotions" && <Promotions onChange={loadOv} />}
      {tab === "hospitals" && <Hospitals />}
      {tab === "users" && <Users />}
    </div>
  );
}

function Promotions({ onChange }: { onChange: () => void }) {
  const [promos, setPromos] = useState<Promotion[] | null>(null);
  const [hospitals, setHospitals] = useState<AdminHospital[]>([]);
  const [f, setF] = useState({ hospitalId: "", title: "", highlight: "", priority: 3, startsAt: today(), endsAt: plusDays(30) });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api<{ promotions: Promotion[] }>("/admin/promotions").then((r) => setPromos(r.promotions)).catch((e: Error) => setError(e.message));
  }, []);
  useEffect(() => {
    load();
    api<{ hospitals: AdminHospital[] }>("/admin/hospitals").then((r) => setHospitals(r.hospitals)).catch(() => {});
  }, [load]);

  const patch = async (id: string, body: Partial<Pick<Promotion, "active" | "priority">>) => {
    setPromos((ps) => ps?.map((p) => (p.id === id ? { ...p, ...body } : p)) ?? null);
    await api(`/admin/promotions/${id}`, { method: "PATCH", body }).catch((e: Error) => setError(e.message));
    onChange();
  };

  const remove = async (id: string) => {
    if (!window.confirm("Delete this promotion?")) return;
    await api(`/admin/promotions/${id}`, { method: "DELETE" }).catch((e: Error) => setError(e.message));
    load();
    onChange();
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/admin/promotions", {
        method: "POST",
        body: { ...f, startsAt: new Date(`${f.startsAt}T00:00:00`).toISOString(), endsAt: new Date(`${f.endsAt}T23:59:59`).toISOString() },
      });
      setF((x) => ({ ...x, title: "", highlight: "" }));
      load();
      onChange();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <Panel title="Promotions">
        <p className="-mt-2 mb-4 text-[13.5px] text-muted">Hospitals only, never individual doctors (NMC, 6 Oct 2026). A sponsored hospital moves up at most 3 places, only within 10 km of the patient, and at most 2 sit in the top 5. Always labelled. Health claims like &quot;cure&quot; or &quot;best&quot; are blocked.</p>
        {error && <ErrorNote>{error}</ErrorNote>}
        <ul className="space-y-3">
          {(promos ?? []).map((p) => {
            const s = promoState(p);
            return (
              <li key={p.id} className="flex flex-col gap-3 rounded-[18px] bg-[#fafbfe] p-4 ring-1 ring-line sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[15.5px] font-semibold">{p.hospital.name}</p>
                    <Badge tone={s.tone} dot>
                      {s.label}
                    </Badge>
                  </div>
                  <p className="text-[13.5px] text-ink-2">
                    {p.title}: {p.highlight}
                  </p>
                  <p className="mt-0.5 font-mono text-[12px] text-muted">
                    {new Date(p.startsAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} → {new Date(p.endsAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · {p.hospital.city}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex items-center rounded-full bg-white ring-1 ring-line">
                    <button className="grid size-9 place-items-center rounded-full hover:bg-mist disabled:opacity-30" onClick={() => patch(p.id, { priority: p.priority - 1 })} disabled={p.priority <= 1} aria-label="Lower priority">
                      <Minus className="size-4" />
                    </button>
                    <span className="w-14 text-center font-mono text-[12.5px]">P{p.priority}</span>
                    <button className="grid size-9 place-items-center rounded-full hover:bg-mist disabled:opacity-30" onClick={() => patch(p.id, { priority: p.priority + 1 })} disabled={p.priority >= 10} aria-label="Raise priority">
                      <Plus className="size-4" />
                    </button>
                  </span>
                  <Button size="sm" className="h-9" variant={p.active ? "secondary" : "primary"} onClick={() => patch(p.id, { active: !p.active })}>
                    {p.active ? "Pause" : "Resume"}
                  </Button>
                  <button onClick={() => remove(p.id)} className="grid size-9 place-items-center rounded-full text-muted hover:bg-rose/8 hover:text-rose" aria-label="Delete promotion">
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </Panel>

      <Panel title="New promotion">
        <form onSubmit={create} className="space-y-3">
          <Field label="Hospital">
            <select className={inputClass} required value={f.hospitalId} onChange={(e) => setF((x) => ({ ...x, hospitalId: e.target.value }))}>
              <option value="">Choose a hospital</option>
              {hospitals.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}, {h.city}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Campaign name">
            <input className={inputClass} required value={f.title} onChange={(e) => setF((x) => ({ ...x, title: e.target.value }))} placeholder="Heart month" />
          </Field>
          <Field label="Line patients see" hint="Max 120">
            <input className={inputClass} required maxLength={120} value={f.highlight} onChange={(e) => setF((x) => ({ ...x, highlight: e.target.value }))} placeholder="Free ECG with every cardiology visit" />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Starts">
              <input className={inputClass} type="date" required value={f.startsAt} onChange={(e) => setF((x) => ({ ...x, startsAt: e.target.value }))} />
            </Field>
            <Field label="Ends">
              <input className={inputClass} type="date" required value={f.endsAt} onChange={(e) => setF((x) => ({ ...x, endsAt: e.target.value }))} />
            </Field>
          </div>
          <Field label="Priority">
            <div className="flex flex-wrap gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button type="button" key={n} onClick={() => setF((x) => ({ ...x, priority: n }))} className={`h-9 w-11 rounded-full font-mono text-[13px] ${f.priority === n ? "bg-blue text-white" : "bg-mist text-ink-2"}`}>
                  P{n}
                </button>
              ))}
            </div>
          </Field>
          <Button type="submit" className="w-full" size="lg" loading={busy}>
            Start promotion
          </Button>
        </form>
      </Panel>
    </div>
  );
}

function RegistryEditor({ h, onSaved }: { h: AdminHospital; onSaved: () => void }) {
  const [reg, setReg] = useState(h.registrationNo ?? "");
  const [hfr, setHfr] = useState(h.hfrId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await api(`/admin/hospitals/${h.id}`, { method: "PATCH", body: { registrationNo: reg || null, hfrId: hfr } });
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="grid gap-2 rounded-2xl bg-mist p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <Field label="State registration no.">
        <input className={inputClass} value={reg} onChange={(e) => setReg(e.target.value)} placeholder="GJ/AMC/CEA/2019/0412" />
      </Field>
      <Field label="ABDM HFR ID">
        <input className={inputClass} value={hfr} onChange={(e) => setHfr(e.target.value)} placeholder="IN2410000187" />
      </Field>
      <Button onClick={save} loading={busy} className="h-12">
        Save
      </Button>
      {error && (
        <div className="sm:col-span-3">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}
    </div>
  );
}

function Hospitals() {
  const [rows, setRows] = useState<AdminHospital[] | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const load = useCallback(() => {
    api<{ hospitals: AdminHospital[] }>("/admin/hospitals")
      .then((r) => setRows(r.hospitals))
      .catch(() => setRows([]));
  }, []);
  useEffect(load, [load]);

  const toggle = async (h: AdminHospital) => {
    setRows((xs) => xs?.map((x) => (x.id === h.id ? { ...x, verified: !x.verified } : x)) ?? null);
    await api(`/admin/hospitals/${h.id}`, { method: "PATCH", body: { verified: !h.verified } }).catch(load);
  };

  return (
    <Panel title="Hospitals">
      <p className="-mt-2 mb-4 text-[13.5px] text-muted">Check the registration number and HFR ID before a hospital goes live. High cancellations, no-shows or expired requests mean the desk needs help.</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-[14px]">
          <thead className="text-[12.5px] text-muted">
            <tr className="border-b border-line">
              <th className="py-3 font-medium">Hospital</th>
              <th className="py-3 font-medium">Registry</th>
              <th className="py-3 text-right font-medium">Bookings</th>
              <th className="py-3 text-right font-medium">Arrived</th>
              <th className="py-3 text-right font-medium">Cancelled</th>
              <th className="py-3 text-right font-medium">No-show</th>
              <th className="py-3 text-right font-medium">Expired</th>
              <th className="py-3 text-right font-medium">Listing</th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((h) => (
              <Fragment key={h.id}>
                <tr className="border-b border-line last:border-0">
                  <td className="py-3">
                    <span className="font-semibold">{h.name}</span>
                    <span className="block text-[12.5px] text-muted">
                      {h.city} · {h._count.doctors} doctors
                    </span>
                  </td>
                  <td className="py-3">
                    <button onClick={() => setEditing(editing === h.id ? null : h.id)} className="text-left text-[12.5px] hover:text-blue">
                      {h.hfrId ? <span className="font-mono">{h.hfrId}</span> : <span className="font-semibold text-amber">Add IDs</span>}
                      {h.registrationNo && <span className="block text-muted">{h.registrationNo}</span>}
                    </button>
                  </td>
                  <td className="py-3 text-right font-mono">{h._count.appointments}</td>
                  <td className="py-3 text-right font-mono">{h.stats.arrived}</td>
                  <td className="py-3 text-right font-mono">{h.stats.cancelled}</td>
                  <td className="py-3 text-right font-mono">{h.stats.noShow}</td>
                  <td className="py-3 text-right font-mono">{h.stats.expired}</td>
                  <td className="py-3 text-right">
                    <Button size="sm" variant={h.verified ? "secondary" : "primary"} onClick={() => toggle(h)}>
                      {h.verified ? "Live · Hide" : "Hidden · Verify"}
                    </Button>
                  </td>
                </tr>
                {editing === h.id && (
                  <tr>
                    <td colSpan={8} className="pb-4">
                      <RegistryEditor
                        h={h}
                        onSaved={() => {
                          setEditing(null);
                          load();
                        }}
                      />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function Users() {
  const [rows, setRows] = useState<AdminUser[] | null>(null);
  useEffect(() => {
    api<{ users: AdminUser[] }>("/admin/users").then((r) => setRows(r.users)).catch(() => setRows([]));
  }, []);
  const tone = { USER: "grey", HOSPITAL: "blue", DOCTOR: "green", ADMIN: "ink" } as const;
  return (
    <Panel title="Recent sign-ups">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-[14px]">
          <thead className="text-[12.5px] text-muted">
            <tr className="border-b border-line">
              <th className="py-3 font-medium">Name</th>
              <th className="py-3 font-medium">Email</th>
              <th className="py-3 font-medium">Mobile</th>
              <th className="py-3 font-medium">Role</th>
              <th className="py-3 text-right font-medium">Joined</th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((u) => (
              <tr key={u.id} className="border-b border-line last:border-0">
                <td className="py-3">
                  <span className="font-semibold">{u.name}</span> <span className="text-muted">@{u.username}</span>
                </td>
                <td className="py-3 text-muted">{u.email}</td>
                <td className="py-3 font-mono text-[13px] text-muted">{u.phone ?? "–"}</td>
                <td className="py-3">
                  <Badge tone={tone[u.role as keyof typeof tone] ?? "grey"}>{u.role.toLowerCase()}</Badge>
                  {u.hospital && <span className="ml-2 text-[12.5px] text-muted">{u.hospital.name}</span>}
                </td>
                <td className="py-3 text-right text-muted">{new Date(u.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
