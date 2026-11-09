"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CalendarPlus, CalendarX2, IndianRupee, Phone, Trash2, UserPlus, X } from "lucide-react";
import { api } from "@/lib/api";
import { EVENT_TYPE, WEEKDAYS, dayLabel, doctorHours, eventWhen, time12, tokenCode } from "@/lib/format";
import type { Appointment, Doctor, EventType, HospitalEvent, Role } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ErrorNote, Field, inputClass } from "@/components/ui/Field";
import { Empty, Panel, Segmented, Stat, StatusBadge } from "./bits";
import { DoctorForm } from "./DoctorForm";
import { HospitalProfile } from "./HospitalProfile";
import { QueueBar } from "./QueueBar";
import { YourPromotions } from "./YourPromotions";
import { StaffPanel } from "./StaffPanel";
import { useIsManager } from "@/lib/auth";

type Overview = {
  hospital: { id: string; name: string; slug: string; city: string } | null;
  today: string;
  counts: { pending: number; awaitingConfirm: number; todayConfirmed: number; todayArrived: number; upcomingEvents: number; doctors: number };
};
type Tab = "today" | "action" | "upcoming" | "all";
type Action = "accept" | "reject" | "arrive" | "no_show";

const REJECT_REASONS = ["Fully booked", "Doctor on leave", "Needs a referral", "Wrong speciality"];

/** Hospital front desk and doctor workspace. Every decision is a button. */
export function ManageDashboard({ role }: { role: Extract<Role, "HOSPITAL" | "DOCTOR"> }) {
  const isManager = useIsManager();
  const [ov, setOv] = useState<Overview | null>(null);
  const [appts, setAppts] = useState<Appointment[] | null>(null);
  const [doctors, setDoctors] = useState<Doctor[] | null>(null);
  const [tab, setTab] = useState<Tab>("today");
  const [busy, setBusy] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [walkIn, setWalkIn] = useState(false);
  const [tick, setTick] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api<Overview>("/manage/overview").then(setOv).catch((e: Error) => setError(e.message));
    api<{ appointments: Appointment[] }>("/manage/appointments").then((r) => setAppts(r.appointments)).catch((e: Error) => setError(e.message));
    api<{ doctors: Doctor[] }>("/manage/doctors").then((r) => setDoctors(r.doctors)).catch(() => setDoctors([]));
  }, []);
  useEffect(load, [load]);

  /** Reload everything, including the live queue bar (used after actions and on the timer). */
  const refresh = useCallback(() => {
    setTick((t) => t + 1);
    load();
  }, [load]);

  // The desk inbox refreshes itself every 15 seconds.
  useEffect(() => {
    const id = setInterval(refresh, 15_000);
    return () => clearInterval(id);
  }, [refresh]);

  const run = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    setError(null);
    try {
      await fn();
      setRejecting(null);
      refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };
  const act = (id: string, action: Action, note?: string) => run(id + action, () => api(`/manage/appointments/${id}/action`, { method: "POST", body: { action, note } }));
  const paid = (id: string) => run(id + "paid", () => api(`/manage/appointments/${id}/paid`, { method: "POST" }));

  const lists = useMemo(() => {
    const all = appts ?? [];
    const today = ov?.today;
    return {
      today: all.filter((a) => a.date === today && ["CONFIRMED", "COMPLETED", "NO_SHOW"].includes(a.status)).sort((a, b) => (a.tokenNumber ?? 0) - (b.tokenNumber ?? 0) || a.time.localeCompare(b.time)),
      action: all.filter((a) => a.status === "PENDING" || a.status === "DOCTOR_APPROVED"),
      upcoming: all.filter((a) => a.status === "CONFIRMED" && a.date !== today),
      all,
    };
  }, [appts, ov?.today]);
  const rows = lists[tab];

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono text-[11.5px] uppercase tracking-[0.14em] text-blue">{role === "DOCTOR" ? "Doctor workspace" : "Bookings desk"}</p>
          <h1 className="mt-1 font-display text-[clamp(1.9rem,4vw,2.6rem)] font-extrabold leading-none tracking-[-0.045em]">{ov?.hospital?.name ?? "…"}</h1>
        </div>
        {role === "HOSPITAL" && (
          <Button size="lg" onClick={() => setWalkIn(true)}>
            <UserPlus className="size-5" /> Add walk-in
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Waiting for approval" value={ov?.counts.pending ?? "–"} tone="amber" hint="Accept or reject below" />
        <Stat label="In today's queue" value={ov?.counts.todayConfirmed ?? "–"} tone="green" />
        <Stat label="Arrived today" value={ov?.counts.todayArrived ?? "–"} />
        <Stat label="Upcoming events" value={ov?.counts.upcomingEvents ?? "–"} tone="blue" />
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}

      <AnimatePresence>{walkIn && doctors && <WalkInForm doctors={doctors} onClose={() => setWalkIn(false)} onAdded={refresh} />}</AnimatePresence>

      <Panel
        title="Bookings"
        action={
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { value: "today", label: "Today", count: lists.today.length },
              { value: "action", label: "Needs action", count: lists.action.length },
              { value: "upcoming", label: "Upcoming", count: lists.upcoming.length },
              { value: "all", label: "All" },
            ]}
          />
        }
      >
        {tab === "today" && <QueueBar hospitalSlug={ov?.hospital?.slug} refreshKey={tick} onCalled={refresh} />}
        {appts === null ? (
          <div className="h-40 animate-pulse rounded-2xl bg-mist" />
        ) : rows.length === 0 ? (
          <Empty
            title={tab === "action" ? "All caught up" : tab === "today" ? "No one in today's queue yet" : "Nothing here yet"}
            body={tab === "action" ? "New requests appear here as patients book." : tab === "today" ? "Confirmed bookings and walk-ins for today show here." : "Bookings will show here."}
          />
        ) : (
          <ul className="space-y-3">
            {rows.map((a) => (
              <li key={a.id} className="rounded-[20px] bg-[#fafbfe] p-4 ring-1 ring-line sm:p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-center">
                  <div className="flex w-[118px] shrink-0 flex-row items-baseline gap-2 md:flex-col md:gap-0">
                    {a.tokenNumber !== null && tab === "today" ? (
                      <span className="font-mono text-[26px] font-bold leading-none text-blue">{tokenCode(a.tokenNumber, a.doctor.name)}</span>
                    ) : (
                      <span className="font-display text-[22px] font-extrabold leading-none tracking-[-0.03em]">{time12(a.time)}</span>
                    )}
                    <span className="text-[13px] font-semibold text-muted">{tab === "today" ? time12(a.time) : dayLabel(a.date)}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[16px] font-semibold">
                        {a.patientName}
                        {a.patientAge ? <span className="font-normal text-muted">, {a.patientAge}</span> : null}
                      </p>
                      <StatusBadge status={a.status} />
                      {a.walkIn && <Badge tone="ink">Walk-in</Badge>}
                      {a.calledAt && a.status === "CONFIRMED" && <Badge tone="blue">Called</Badge>}
                      {a.paidAt && (
                        <Badge tone="green">
                          <IndianRupee className="size-3" /> Paid
                        </Badge>
                      )}
                      {a.tokenNumber !== null && tab !== "today" && <span className="rounded-full bg-ink px-2.5 py-0.5 font-mono text-[12px] text-white">{tokenCode(a.tokenNumber, a.doctor.name)}</span>}
                    </div>
                    <p className="mt-0.5 text-[13.5px] text-muted">
                      {role === "HOSPITAL" && `${a.doctor.name} · `}
                      {a.reason || (a.walkIn ? "Walked in" : "No reason given")}
                    </p>
                    {(a.user?.phone || a.walkInPhone) && (
                      <a href={`tel:${a.user?.phone ?? a.walkInPhone}`} className="mt-1 inline-flex items-center gap-1.5 text-[13px] font-semibold text-blue">
                        <Phone className="size-3.5" /> {a.user?.phone ?? a.walkInPhone}
                      </a>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(a.status === "PENDING" || a.status === "DOCTOR_APPROVED") && (
                      <>
                        <Button variant="success" onClick={() => act(a.id, "accept")} loading={busy === a.id + "accept"}>
                          Accept & give token
                        </Button>
                        <Button variant="danger" onClick={() => setRejecting(a.id)}>
                          Reject
                        </Button>
                      </>
                    )}
                    {a.status === "CONFIRMED" && (
                      <>
                        <Button variant="success" onClick={() => act(a.id, "arrive")} loading={busy === a.id + "arrive"}>
                          Arrived
                        </Button>
                        <Button variant="ghost" onClick={() => act(a.id, "no_show")} loading={busy === a.id + "no_show"}>
                          Didn&apos;t come
                        </Button>
                      </>
                    )}
                    {role === "HOSPITAL" && ["CONFIRMED", "COMPLETED"].includes(a.status) && !a.paidAt && (
                      <Button variant="secondary" onClick={() => paid(a.id)} loading={busy === a.id + "paid"}>
                        <IndianRupee className="size-4" /> Paid
                      </Button>
                    )}
                  </div>
                </div>
                <AnimatePresence>
                  {rejecting === a.id && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
                        <span className="text-[13.5px] font-semibold text-ink-2">Why? Tap one:</span>
                        {REJECT_REASONS.map((r) => (
                          <Button key={r} size="sm" variant="danger" onClick={() => act(a.id, "reject", r)} loading={busy === a.id + "reject"}>
                            {r}
                          </Button>
                        ))}
                        <button onClick={() => setRejecting(null)} className="ml-auto grid size-9 place-items-center rounded-full text-muted hover:bg-mist" aria-label="Don't reject">
                          <X className="size-4" />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-[12.5px] text-muted">Requests nobody answers in time expire automatically, and the patient is told. This list refreshes every 15 seconds.</p>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <DoctorsPanel role={role} doctors={doctors} today={ov?.today} onChange={refresh} />
        <EventsPanel onChange={load} />
      </div>

      {isManager && <StaffPanel />}
      {isManager && <YourPromotions />}
      {isManager && <HospitalProfile />}
    </div>
  );
}

function WalkInForm({ doctors, onClose, onAdded }: { doctors: Doctor[]; onClose: () => void; onAdded: () => void }) {
  const [doctorId, setDoctorId] = useState(doctors[0]?.id ?? "");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<Appointment | null>(null);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ appointment: Appointment }>("/manage/walk-ins", { method: "POST", body: { doctorId, name, phone, age: age ? Number(age) : undefined } });
      setAdded(r.appointment);
      setName("");
      setPhone("");
      setAge("");
      onAdded();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.section initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="rounded-[26px] bg-white p-5 ring-2 ring-blue sm:p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-display text-[20px] font-bold tracking-[-0.03em]">Add a walk-in</p>
          <p className="text-[14px] text-muted">They join today&apos;s queue with the next token.</p>
        </div>
        <button onClick={onClose} className="grid size-10 place-items-center rounded-full bg-mist" aria-label="Close">
          <X className="size-4" />
        </button>
      </div>
      {added && (
        <div className="mt-4 flex items-center gap-4 rounded-2xl bg-signal/10 p-4">
          <span className="font-mono text-[32px] font-bold text-signal">{tokenCode(added.tokenNumber, added.doctor.name)}</span>
          <span className="text-[14px] text-ink-2">
            Token for <b>{added.patientName}</b> with {added.doctor.name}. Tell them this number.
          </span>
        </div>
      )}
      <p className="mt-4 text-[13.5px] font-semibold text-ink-2">Doctor</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {doctors.map((d) => (
          <button key={d.id} onClick={() => setDoctorId(d.id)} className={`h-10 rounded-full px-4 text-[13.5px] font-semibold ${doctorId === d.id ? "bg-blue text-white" : "bg-mist text-ink-2"}`}>
            {d.name} · {d.specialty}
          </button>
        ))}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_90px]">
        <Field label="Patient name">
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Mobile" hint="Optional">
          <input className={inputClass} type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <Field label="Age">
          <input className={inputClass} inputMode="numeric" value={age} onChange={(e) => setAge(e.target.value.replace(/\D/g, "").slice(0, 3))} />
        </Field>
      </div>
      {error && (
        <div className="mt-3">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}
      <Button size="lg" className="mt-4" onClick={save} loading={busy} disabled={name.trim().length < 2 || !doctorId}>
        Give token
      </Button>
    </motion.section>
  );
}

const SLOT_LENGTHS = [10, 15, 20, 30];

function ScheduleEditor({ d, onSaved }: { d: Doctor; onSaved: () => void }) {
  const [days, setDays] = useState<number[]>(d.workingDays);
  const [start, setStart] = useState(d.startTime);
  const [end, setEnd] = useState(d.endTime);
  const [slot, setSlot] = useState(d.slotMinutes);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await api(`/manage/doctors/${d.id}`, { method: "PATCH", body: { workingDays: days, startTime: start, endTime: end, slotMinutes: slot } });
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3 space-y-3 rounded-2xl bg-mist p-4">
      <div>
        <p className="text-[13px] font-semibold text-ink-2">OPD days</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {[1, 2, 3, 4, 5, 6, 0].map((n) => {
            const on = days.includes(n);
            return (
              <button key={n} onClick={() => setDays((x) => (on ? x.filter((v) => v !== n) : [...x, n]))} aria-pressed={on} className={`h-9 w-12 rounded-full text-[13px] font-semibold ${on ? "bg-blue text-white" : "bg-white text-ink-2 ring-1 ring-line"}`}>
                {WEEKDAYS[n]}
              </button>
            );
          })}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Starts">
          <input className={inputClass} type="time" value={start} onChange={(e) => setStart(e.target.value)} />
        </Field>
        <Field label="Ends">
          <input className={inputClass} type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
        </Field>
      </div>
      <div>
        <p className="text-[13px] font-semibold text-ink-2">Minutes per patient</p>
        <div className="mt-2 flex gap-1.5">
          {SLOT_LENGTHS.map((n) => (
            <button key={n} onClick={() => setSlot(n)} className={`h-9 w-12 rounded-full font-mono text-[13px] ${slot === n ? "bg-ink text-white" : "bg-white ring-1 ring-line"}`}>
              {n}
            </button>
          ))}
        </div>
      </div>
      {error && <ErrorNote>{error}</ErrorNote>}
      <Button size="sm" onClick={save} loading={busy}>
        Save schedule
      </Button>
    </div>
  );
}

function DoctorsPanel({ role, doctors, today, onChange }: { role: Role; doctors: Doctor[] | null; today?: string; onChange: () => void }) {
  const isManager = useIsManager();
  // editing = "<doctorId>:hours" | "<doctorId>:details" | "new"
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const specialties = [...new Set((doctors ?? []).map((d) => d.specialty))];

  const patch = async (d: Doctor, body: Record<string, unknown>, key: string) => {
    setBusy(d.id + key);
    try {
      await api(`/manage/doctors/${d.id}`, { method: "PATCH", body });
    } catch (e) {
      setMsg((e as Error).message);
    }
    setBusy(null);
    onChange();
  };

  const leaveToday = async (d: Doctor) => {
    if (!window.confirm(`Mark ${d.name} on leave today? All of today's bookings with them are cancelled and patients are told.`)) return;
    setBusy(d.id + "leave");
    try {
      const r = await api<{ cancelled: number }>(`/manage/doctors/${d.id}/leave`, { method: "POST", body: { date: today } });
      setMsg(`${d.name} is on leave today. ${r.cancelled} booking${r.cancelled === 1 ? "" : "s"} cancelled and patients notified.`);
      onChange();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const endLeave = async (d: Doctor, date: string) => {
    await api(`/manage/doctors/${d.id}/leave/${date}`, { method: "DELETE" }).catch(() => {});
    onChange();
  };

  const toggleActive = (d: Doctor) => {
    if (d.active && !window.confirm(`Stop new bookings for ${d.name}? Existing bookings stay as they are.`)) return;
    patch(d, { active: !d.active }, "active");
  };

  return (
    <Panel
      title={role === "DOCTOR" ? "My schedule" : "Doctors"}
      action={
        isManager && editing !== "new" ? (
          <Button size="sm" onClick={() => setEditing("new")}>
            <UserPlus className="size-4" /> Add doctor
          </Button>
        ) : null
      }
    >
      {msg && <p className="mb-3 rounded-xl bg-sky px-4 py-3 text-[13.5px] text-blue-deep">{msg}</p>}
      {editing === "new" && (
        <DoctorForm
          specialties={specialties}
          onSaved={() => {
            setEditing(null);
            setMsg("Doctor added. Set their OPD hours with \"Edit hours\".");
            onChange();
          }}
          onCancel={() => setEditing(null)}
        />
      )}
      <ul className="divide-y divide-line">
        {(doctors ?? []).map((d) => {
          const onLeaveToday = d.leaves?.some((l) => l.date === today);
          return (
            <li key={d.id} className={`py-4 ${d.active ? "" : "opacity-60"}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="flex flex-wrap items-center gap-2 text-[15px] font-semibold">
                    {d.name}
                    {!d.active && <Badge tone="grey">Not taking bookings</Badge>}
                  </p>
                  <p className="text-[13px] text-muted">
                    {d.specialty} · {doctorHours(d)} · {d.slotMinutes} min
                  </p>
                  <p className="text-[12px] text-muted">{d.registrationNo ? `Reg. no. ${d.registrationNo}` : "Registration number missing"}</p>
                  {d.leaves && d.leaves.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {d.leaves.map((l) => (
                        <span key={l.id} className="inline-flex items-center gap-1 rounded-full bg-amber/10 py-0.5 pl-2.5 pr-1 text-[12px] font-semibold text-amber">
                          On leave {dayLabel(l.date)}
                          <button onClick={() => endLeave(d, l.date)} className="grid size-5 place-items-center rounded-full hover:bg-amber/20" aria-label={`Remove leave on ${l.date}`}>
                            <X className="size-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {isManager && d.active && (
                    <button
                      onClick={() => patch(d, { autoConfirm: !d.autoConfirm }, "auto")}
                      role="switch"
                      aria-checked={d.autoConfirm}
                      disabled={busy === d.id + "auto"}
                      className={`inline-flex h-9 items-center gap-2 rounded-full pl-1 pr-3.5 text-[12.5px] font-semibold transition ${d.autoConfirm ? "bg-blue text-white" : "bg-mist text-ink-2"}`}
                    >
                      <span className={`grid size-7 place-items-center rounded-full bg-white ${d.autoConfirm ? "text-blue" : "text-muted"}`}>{d.autoConfirm ? "✓" : "–"}</span>
                      Auto-confirm
                    </button>
                  )}
                  {d.active && !onLeaveToday && (
                    <Button size="sm" variant="secondary" className="h-9" onClick={() => leaveToday(d)} loading={busy === d.id + "leave"}>
                      <CalendarX2 className="size-4" /> On leave today
                    </Button>
                  )}
                  {isManager && (
                    <>
                      <Button size="sm" variant="ghost" className="h-9" onClick={() => setEditing(editing === d.id + ":hours" ? null : d.id + ":hours")}>
                        {editing === d.id + ":hours" ? "Close" : "Edit hours"}
                      </Button>
                      <Button size="sm" variant="ghost" className="h-9" onClick={() => setEditing(editing === d.id + ":details" ? null : d.id + ":details")}>
                        {editing === d.id + ":details" ? "Close" : "Edit details"}
                      </Button>
                      <Button size="sm" variant={d.active ? "danger" : "primary"} className="h-9" onClick={() => toggleActive(d)} loading={busy === d.id + "active"}>
                        {d.active ? "Stop bookings" : "Resume bookings"}
                      </Button>
                    </>
                  )}
                </div>
              </div>
              {editing === d.id + ":hours" && (
                <ScheduleEditor
                  d={d}
                  onSaved={() => {
                    setEditing(null);
                    onChange();
                  }}
                />
              )}
              {editing === d.id + ":details" && (
                <DoctorForm
                  doctor={d}
                  specialties={specialties}
                  onSaved={() => {
                    setEditing(null);
                    onChange();
                  }}
                  onCancel={() => setEditing(null)}
                />
              )}
            </li>
          );
        })}
      </ul>
      {isManager && (
        <p className="mt-2 text-[12.5px] text-muted">Auto-confirm on: bookings are confirmed instantly with a token. Off: the desk or the doctor accepts each request, and unanswered requests expire.</p>
      )}
    </Panel>
  );
}

const EVENT_TYPES = Object.keys(EVENT_TYPE) as EventType[];

function EventsPanel({ onChange }: { onChange: () => void }) {
  const isManager = useIsManager();
  const [events, setEvents] = useState<HospitalEvent[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ title: "", description: "", type: "HEALTH_CAMP" as EventType, date: "", from: "09:00", to: "13:00", venue: "", isFree: true });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api<{ events: HospitalEvent[] }>("/manage/events")
      .then((r) => setEvents(r.events))
      .catch(() => setEvents([]));
  }, []);
  useEffect(load, [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/manage/events", {
        method: "POST",
        body: {
          title: f.title,
          description: f.description,
          type: f.type,
          venue: f.venue,
          isFree: f.isFree,
          startsAt: new Date(`${f.date}T${f.from}:00`).toISOString(),
          endsAt: new Date(`${f.date}T${f.to}:00`).toISOString(),
        },
      });
      setAdding(false);
      setF((x) => ({ ...x, title: "", description: "", venue: "" }));
      load();
      onChange();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Delete this event?")) return;
    await api(`/manage/events/${id}`, { method: "DELETE" }).catch(() => {});
    load();
    onChange();
  };

  const upcoming = (events ?? []).filter((e) => new Date(e.endsAt) > new Date());

  return (
    <Panel
      title="Events & camps"
      action={
        isManager && !adding ? (
          <Button size="sm" onClick={() => setAdding(true)}>
            <CalendarPlus className="size-4" /> Add event
          </Button>
        ) : null
      }
    >
      {adding && (
        <form onSubmit={save} className="mb-5 space-y-3 rounded-2xl bg-mist p-4">
          <div className="flex flex-wrap gap-2">
            {EVENT_TYPES.map((t) => (
              <button
                type="button"
                key={t}
                onClick={() => setF((x) => ({ ...x, type: t }))}
                className={`h-9 rounded-full px-3.5 text-[13px] font-semibold ${f.type === t ? "bg-blue text-white" : "bg-white text-ink-2 ring-1 ring-line"}`}
              >
                {EVENT_TYPE[t]}
              </button>
            ))}
          </div>
          <Field label="Title">
            <input className={inputClass} required value={f.title} onChange={(e) => setF((x) => ({ ...x, title: e.target.value }))} placeholder="Free eye check-up camp" />
          </Field>
          <Field label="What happens">
            <input className={inputClass} required minLength={10} value={f.description} onChange={(e) => setF((x) => ({ ...x, description: e.target.value }))} placeholder="Vision test for adults over 50" />
          </Field>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Date">
              <input className={inputClass} type="date" required value={f.date} onChange={(e) => setF((x) => ({ ...x, date: e.target.value }))} />
            </Field>
            <Field label="From">
              <input className={inputClass} type="time" required value={f.from} onChange={(e) => setF((x) => ({ ...x, from: e.target.value }))} />
            </Field>
            <Field label="To">
              <input className={inputClass} type="time" required value={f.to} onChange={(e) => setF((x) => ({ ...x, to: e.target.value }))} />
            </Field>
          </div>
          <Field label="Where in the hospital">
            <input className={inputClass} required value={f.venue} onChange={(e) => setF((x) => ({ ...x, venue: e.target.value }))} placeholder="Main OPD, ground floor" />
          </Field>
          <div className="flex gap-2">
            {[true, false].map((v) => (
              <button type="button" key={String(v)} onClick={() => setF((x) => ({ ...x, isFree: v }))} className={`h-9 rounded-full px-4 text-[13px] font-semibold ${f.isFree === v ? "bg-ink text-white" : "bg-white ring-1 ring-line"}`}>
                {v ? "Free" : "Paid"}
              </button>
            ))}
          </div>
          <p className="text-[12px] text-muted">Words like &quot;cure&quot;, &quot;guaranteed&quot; or &quot;best&quot; aren&apos;t allowed in health promotions.</p>
          {error && <ErrorNote>{error}</ErrorNote>}
          <div className="flex gap-2">
            <Button type="submit" loading={busy}>
              Publish event
            </Button>
            <Button type="button" variant="ghost" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}
      {events !== null && upcoming.length === 0 && !adding ? (
        <p className="text-[14.5px] text-muted">No upcoming events. Camps and talks you add show on your hospital page and the home page.</p>
      ) : (
        <ul className="divide-y divide-line">
          {upcoming.map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-3 py-3.5">
              <div>
                <p className="text-[15px] font-semibold">{e.title}</p>
                <p className="text-[13px] text-muted">
                  {EVENT_TYPE[e.type]} · {eventWhen(e.startsAt, e.endsAt)}
                </p>
              </div>
              {isManager && (
                <button onClick={() => remove(e.id)} className="grid size-9 shrink-0 place-items-center rounded-full text-muted hover:bg-rose/8 hover:text-rose" aria-label={`Delete ${e.title}`}>
                  <Trash2 className="size-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
