"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Bell, CalendarClock, Check, Download, MapPin, Phone, X } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { usePlace } from "@/lib/location";
import { useApi } from "@/lib/useApi";
import { STATUS, dayLabel, inr, time12, tokenCode } from "@/lib/format";
import type { Appointment, Hospital, HospitalEvent, Notice } from "@/lib/types";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ErrorNote, Field, inputClass } from "@/components/ui/Field";
import { HospitalCard } from "@/components/app/HospitalCard";
import { SlotPicker } from "@/components/app/SlotPicker";
import { FamilyPanel } from "@/components/app/Family";
import { EventCard } from "@/components/landing/Events";
import { Empty, Panel, StatusBadge } from "./bits";

const ACTIVE = new Set(["PENDING", "DOCTOR_APPROVED", "CONFIRMED"]);
const STEPS = ["PENDING", "DOCTOR_APPROVED", "CONFIRMED"] as const;
const canMove = (a: Appointment) => ACTIVE.has(a.status) && new Date(`${a.date}T${a.time}:00+05:30`).getTime() - Date.now() > 2 * 3600_000;
const forWhom = (a: Appointment) => (a.profile && a.profile.relation !== "Self" ? `${a.patientName} (${a.profile.relation})` : a.patientName);

function Progress({ a }: { a: Appointment }) {
  const idx = STEPS.indexOf(a.status as (typeof STEPS)[number]);
  const labels = ["Requested", "Doctor approved", "Confirmed"];
  return (
    <ol className="flex items-center gap-2">
      {labels.map((l, i) => {
        const done = idx >= i;
        return (
          <li key={l} className="flex flex-1 items-center gap-2">
            <span className={`grid size-6 shrink-0 place-items-center rounded-full ${done ? "bg-blue text-white" : "bg-white text-muted ring-1 ring-line"}`}>
              {done ? <Check className="size-3.5" strokeWidth={3} /> : <span className="font-mono text-[11px]">{i + 1}</span>}
            </span>
            <span className={`hidden text-[12.5px] font-semibold sm:block ${done ? "text-ink" : "text-muted"}`}>{l}</span>
            {i < labels.length - 1 && <span className={`h-0.5 flex-1 rounded ${idx > i ? "bg-blue" : "bg-line"}`} />}
          </li>
        );
      })}
    </ol>
  );
}

/** Pick a new slot with the same doctor. One button to move. */
function MoveSheet({ a, onClose, onMoved }: { a: Appointment; onClose: () => void; onMoved: () => void }) {
  const [date, setDate] = useState(a.date);
  const [time, setTime] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [k, setK] = useState(0);

  const move = async () => {
    if (!time) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/appointments/${a.id}/reschedule`, { method: "POST", body: { date, time } });
      onMoved();
    } catch (e) {
      setError((e as Error).message);
      setTime(null);
      setK((x) => x + 1);
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Move booking"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[460px] rounded-t-[28px] bg-white p-6 sm:rounded-[28px]"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="font-display text-[22px] font-bold tracking-[-0.03em]">Move booking</p>
            <p className="text-[14px] text-muted">
              {a.doctor.name} · now {dayLabel(a.date)}, {time12(a.time)}
            </p>
          </div>
          <button onClick={onClose} className="grid size-10 place-items-center rounded-full bg-mist" aria-label="Close">
            <X className="size-4" />
          </button>
        </div>
        <div className="mt-5">
          <SlotPicker
            key={k}
            doctorId={a.doctor.id}
            date={date}
            time={time}
            onDate={(d) => {
              setDate(d);
              setTime(null);
            }}
            onTime={setTime}
            exclude={{ date: a.date, time: a.time }}
          />
        </div>
        {error && (
          <div className="mt-4">
            <ErrorNote>{error}</ErrorNote>
          </div>
        )}
        <Button size="lg" className="mt-5 w-full" arrow loading={busy} disabled={!time} onClick={move}>
          {time ? `Move to ${dayLabel(date)}, ${time12(time)}` : "Pick a new time"}
        </Button>
        <p className="mt-2 text-center text-[12px] text-muted">Your old slot is released only once the new one is yours. The doctor reviews it again.</p>
      </motion.div>
    </motion.div>
  );
}

function NextVisit({ a, onCancel, onMove, busy }: { a: Appointment; onCancel: () => void; onMove: () => void; busy: boolean }) {
  const confirmed = a.status === "CONFIRMED";
  return (
    <section className="overflow-hidden rounded-[28px] bg-white ring-1 ring-line">
      <div className="grid md:grid-cols-[1fr_260px]">
        <div className="p-6 sm:p-7">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[11.5px] uppercase tracking-[0.14em] text-blue">Your next visit</span>
            <StatusBadge status={a.status} />
          </div>
          <p className="mt-3 font-display text-[clamp(1.6rem,3vw,2.2rem)] font-extrabold leading-tight tracking-[-0.04em]">
            {dayLabel(a.date)}, {time12(a.time)}
          </p>
          <p className="mt-1 text-[15px] text-ink-2">
            {a.doctor.name} · {a.doctor.specialty} · for {forWhom(a)}
          </p>
          {a.hospital && (
            <p className="mt-1 flex items-center gap-1.5 text-[14px] text-muted">
              <MapPin className="size-4" /> {a.hospital.name}, {a.hospital.address}
            </p>
          )}
          <div className="mt-6">
            <Progress a={a} />
          </div>
          <p className="mt-3 text-[13.5px] text-muted">{STATUS[a.status].help}.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {a.hospital && (
              <a href={`tel:${a.hospital.phone.replace(/\s/g, "")}`} className="inline-flex h-10 items-center gap-2 rounded-full bg-mist px-4 text-[14px] font-semibold text-ink hover:bg-sky">
                <Phone className="size-4" /> Call hospital
              </a>
            )}
            {canMove(a) && (
              <Button variant="secondary" size="sm" className="h-10" onClick={onMove}>
                <CalendarClock className="size-4" /> Move
              </Button>
            )}
            <Button variant="danger" size="sm" className="h-10" onClick={onCancel} loading={busy}>
              Cancel booking
            </Button>
          </div>
        </div>
        <div className={`flex flex-col items-center justify-center border-t border-dashed border-line p-6 md:border-l md:border-t-0 ${confirmed ? "bg-blue text-white" : "bg-mist"}`}>
          <p className={`font-mono text-[11px] uppercase tracking-[0.18em] ${confirmed ? "text-white/70" : "text-muted"}`}>Token</p>
          <p className={`mt-1 font-mono text-[56px] font-bold leading-none ${confirmed ? "" : "text-muted/40"}`}>{confirmed ? tokenCode(a.tokenNumber, a.doctor.name) : "··"}</p>
          <p className={`mt-3 max-w-[200px] text-center text-[12.5px] ${confirmed ? "text-white/80" : "text-muted"}`}>
            {confirmed ? `Show this at the desk. Pay ${a.doctor.fee ? inr(a.doctor.fee) : "the fee"} there.` : "Your token appears here once the hospital confirms."}
          </p>
        </div>
      </div>
    </section>
  );
}

function Updates() {
  const req = useApi<{ notifications: Notice[]; unread: number }>("/me/notifications");
  const items = req.data?.notifications ?? [];
  const unread = req.data?.unread ?? 0;
  const markRead = async () => {
    await api("/me/notifications/read", { method: "POST" }).catch(() => {});
    req.reload();
  };
  return (
    <Panel
      title="Updates"
      action={
        unread > 0 ? (
          <Button size="sm" variant="ghost" onClick={markRead}>
            Mark all read
          </Button>
        ) : null
      }
    >
      {items.length === 0 ? (
        <p className="text-[14.5px] text-muted">Booking updates from hospitals show here.</p>
      ) : (
        <ul className="space-y-2">
          {items.slice(0, 6).map((n) => (
            <li key={n.id} className={`flex gap-3 rounded-2xl p-3 ${n.readAt ? "" : "bg-sky/60"}`}>
              <span className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl ${n.readAt ? "bg-mist text-muted" : "bg-blue text-white"}`}>
                <Bell className="size-4" />
              </span>
              <div>
                <p className="text-[14.5px] font-semibold">{n.title}</p>
                <p className="text-[13px] text-muted">{n.body}</p>
                <p className="mt-0.5 text-[11.5px] text-muted/80">{new Date(n.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function Account() {
  const { logout } = useAuth();
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const download = async () => {
    const data = await api<unknown>("/me/export");
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "vitalyn-my-data.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const remove = async () => {
    setBusy(true);
    setError(null);
    try {
      await api("/me", { method: "DELETE", body: { password } });
      logout();
      router.push("/");
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <Panel title="Your data">
      <p className="text-[14px] text-muted">See exactly what we hold, or delete your account. Hospitals keep an anonymised record of past visits.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={download}>
          <Download className="size-4" /> Download my data
        </Button>
        {!deleting && (
          <Button variant="danger" size="sm" onClick={() => setDeleting(true)}>
            Delete my account
          </Button>
        )}
      </div>
      {deleting && (
        <div className="mt-4 space-y-3 rounded-2xl bg-rose/6 p-4">
          <p className="text-[14px] font-semibold text-rose">This cancels your upcoming bookings and erases your account. It can&apos;t be undone.</p>
          <Field label="Enter your password to confirm">
            <input className={inputClass} type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          {error && <ErrorNote>{error}</ErrorNote>}
          <div className="flex gap-2">
            <Button variant="danger" onClick={remove} loading={busy} disabled={!password}>
              Delete permanently
            </Button>
            <Button variant="ghost" onClick={() => setDeleting(false)}>
              Keep my account
            </Button>
          </div>
        </div>
      )}
    </Panel>
  );
}

export function PatientDashboard({ name }: { name: string }) {
  const { place } = usePlace();
  const [appts, setAppts] = useState<Appointment[] | null>(null);
  const [recs, setRecs] = useState<Hospital[]>([]);
  const [events, setEvents] = useState<HospitalEvent[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [moving, setMoving] = useState<Appointment | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api<{ appointments: Appointment[] }>("/appointments/me")
      .then((r) => setAppts(r.appointments))
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(load, [load]);
  useEffect(() => {
    api<{ recommendations: Hospital[] }>("/hospitals/recommendations", { query: { lat: place.lat, lng: place.lng } })
      .then((r) => setRecs(r.recommendations.slice(0, 3)))
      .catch(() => {});
    api<{ events: HospitalEvent[] }>("/events", { query: { limit: 2 } })
      .then((r) => setEvents(r.events))
      .catch(() => {});
  }, [place.lat, place.lng]);

  const cancel = async (id: string) => {
    if (!window.confirm("Cancel this booking? The slot will go to someone else.")) return;
    setBusyId(id);
    try {
      await api(`/appointments/${id}/cancel`, { method: "POST" });
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const active = (appts ?? []).filter((a) => ACTIVE.has(a.status)).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const past = (appts ?? []).filter((a) => !ACTIVE.has(a.status));
  const [next, ...later] = active;

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="font-deva text-[20px] italic text-blue">नमस्ते,</p>
          <h1 className="font-display text-[clamp(2rem,4vw,2.8rem)] font-extrabold leading-none tracking-[-0.045em]">{name.split(" ")[0]}</h1>
        </div>
        <ButtonLink href="/hospitals" size="lg" arrow>
          Book an appointment
        </ButtonLink>
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}

      {appts === null ? (
        <div className="h-64 animate-pulse rounded-[28px] bg-white ring-1 ring-line" />
      ) : next ? (
        <NextVisit a={next} onCancel={() => cancel(next.id)} onMove={() => setMoving(next)} busy={busyId === next.id} />
      ) : (
        <Empty
          title="No upcoming visits"
          body="Find a hospital near you and pick a time. It takes about a minute."
          action={
            <ButtonLink href="/hospitals" arrow>
              Find a hospital
            </ButtonLink>
          }
        />
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Other upcoming bookings">
          {later.length === 0 ? (
            <p className="text-[14.5px] text-muted">Nothing else booked.</p>
          ) : (
            <ul className="divide-y divide-line">
              {later.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3.5">
                  <div className="flex items-center gap-3">
                    <span className="grid size-11 place-items-center rounded-2xl bg-sky text-blue">
                      <CalendarClock className="size-5" />
                    </span>
                    <div>
                      <p className="text-[15px] font-semibold">
                        {dayLabel(a.date)}, {time12(a.time)}
                      </p>
                      <p className="text-[13px] text-muted">
                        {a.doctor.name} · for {forWhom(a)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <StatusBadge status={a.status} />
                    {canMove(a) && (
                      <Button variant="ghost" size="sm" onClick={() => setMoving(a)}>
                        Move
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => cancel(a.id)} loading={busyId === a.id}>
                      Cancel
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Updates key={appts?.length ?? 0} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Past visits">
          {past.length === 0 ? (
            <p className="text-[14.5px] text-muted">Your visit history will show here.</p>
          ) : (
            <ul className="divide-y divide-line">
              {past.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-3.5">
                  <div>
                    <p className="text-[15px] font-semibold">
                      {new Date(`${a.date}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} · {a.doctor.name}
                    </p>
                    <p className="text-[13px] text-muted">
                      For {forWhom(a)} · {a.hospital?.name}
                      {a.note ? ` · ${a.note}` : ""}
                    </p>
                  </div>
                  <StatusBadge status={a.status} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Family members">
          <FamilyPanel />
        </Panel>
      </div>

      {recs.length > 0 && (
        <section>
          <h2 className="font-display text-[22px] font-bold tracking-[-0.03em]">Recommended near you</h2>
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {recs.map((h) => (
              <HospitalCard key={h.id} h={h} showHighlight />
            ))}
          </div>
        </section>
      )}

      {events.length > 0 && (
        <section>
          <h2 className="font-display text-[22px] font-bold tracking-[-0.03em]">Upcoming health camps</h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {events.map((e) => (
              <EventCard key={e.id} e={e} />
            ))}
          </div>
        </section>
      )}

      <Account />

      <AnimatePresence>
        {moving && (
          <MoveSheet
            a={moving}
            onClose={() => setMoving(null)}
            onMoved={() => {
              setMoving(null);
              load();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
