"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, BadgeCheck, BedDouble, CheckCircle2, Clock, Languages, MapPin, Navigation, Phone, Siren, Star } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { usePlace } from "@/lib/location";
import { useApi } from "@/lib/useApi";
import { dayLabel, doctorHours, inr, km, nextDays, nextSlotLabel, time12 } from "@/lib/format";
import type { Appointment, Doctor, Hospital, HospitalEvent } from "@/lib/types";
import { HospitalTile } from "@/components/ui/HospitalTile";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ErrorNote, Field, inputClass } from "@/components/ui/Field";
import { EventCard } from "@/components/landing/Events";
import { SlotPicker } from "@/components/app/SlotPicker";
import { ProfilePicker, defaultProfileId, useProfiles } from "@/components/app/Family";

type Full = Hospital & { doctors: Doctor[]; events: HospitalEvent[] };

export default function HospitalPage() {
  const { slug } = useParams<{ slug: string }>();
  const { place } = usePlace();
  const req = useApi<{ hospital: Full }>(`/hospitals/${slug}`, { lat: place.lat, lng: place.lng });
  const h = req.data?.hospital ?? null;
  const [doctorId, setDoctorId] = useState<string | null>(null);

  if (req.error)
    return (
      <div className="rounded-3xl bg-white p-10 text-center ring-1 ring-line">
        <p className="font-display text-xl font-bold">{req.error}</p>
        <ButtonLink href="/hospitals" variant="secondary" className="mt-4">
          Back to hospitals
        </ButtonLink>
      </div>
    );
  if (!h) return <div className="h-[420px] animate-pulse rounded-[28px] bg-white ring-1 ring-line" />;

  const doctor = h.doctors.find((d) => d.id === doctorId) ?? null;
  const maps = `https://www.google.com/maps/dir/?api=1&destination=${h.lat},${h.lng}`;
  const next = nextSlotLabel(h.nextSlotAt);

  return (
    <div>
      <Link href="/hospitals" className="inline-flex items-center gap-2 text-[14px] font-semibold text-muted hover:text-blue">
        <ArrowLeft className="size-4" /> All hospitals
      </Link>

      <section className="mt-4 overflow-hidden rounded-[28px] bg-white ring-1 ring-line">
        <div className="grid md:grid-cols-[1.1fr_1fr]">
          <HospitalTile name={h.name} tone={h.tone} imageUrl={h.imageUrl} className="aspect-[16/10] md:aspect-auto md:min-h-[300px]" sizes="(max-width: 768px) 100vw, 640px" />
          <div className="flex flex-col p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-2">
              {h.emergency24x7 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-rose/8 px-2.5 py-1 text-[12px] font-semibold text-rose">
                  <Siren className="size-3.5" /> 24×7 emergency
                </span>
              )}
              {h.hfrId && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-signal/10 px-2.5 py-1 text-[12px] font-semibold text-signal" title={`ABDM Health Facility Registry ID ${h.hfrId}`}>
                  <BadgeCheck className="size-3.5" /> ABDM registered
                </span>
              )}
            </div>
            <h1 className="mt-3 font-display text-[clamp(1.9rem,3.6vw,2.6rem)] font-extrabold leading-[1] tracking-[-0.045em] text-ink">{h.name}</h1>
            <p className="mt-2 text-[15.5px] text-muted">{h.description}</p>
            <dl className="mt-5 grid grid-cols-2 gap-3 text-[14px]">
              <div className="flex items-center gap-2 text-ink-2">
                <Star className="size-4 fill-amber text-amber" />
                {h.reviewCount > 0 ? (
                  <span>
                    <b>{h.rating.toFixed(1)}</b> ({h.reviewCount.toLocaleString("en-IN")} reviews)
                  </span>
                ) : (
                  <span>New on Vitalyn</span>
                )}
              </div>
              <div className="flex items-center gap-2 text-ink-2">
                <BedDouble className="size-4 text-blue" /> {h.beds} beds
              </div>
              <div className="col-span-2 flex items-start gap-2 text-ink-2">
                <MapPin className="mt-0.5 size-4 shrink-0 text-blue" />
                <span>
                  {h.address}, {h.city} {h.pincode}
                  {h.distanceKm !== null && <span className="ml-2 font-mono text-[12.5px] text-blue">{km(h.distanceKm)} away</span>}
                </span>
              </div>
              {next && (
                <div className="col-span-2 flex items-center gap-2 text-ink-2">
                  <Clock className="size-4 text-blue" /> Next free slot: <b>{next}</b>
                </div>
              )}
            </dl>
            <div className="mt-auto flex flex-wrap gap-2 pt-6">
              <a href={`tel:${h.phone.replace(/\s/g, "")}`} className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-[14.5px] font-semibold text-white hover:bg-ink-2">
                <Phone className="size-4" /> Call hospital
              </a>
              <a href={maps} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-[14.5px] font-semibold text-ink ring-1 ring-line hover:ring-blue/40">
                <Navigation className="size-4" /> Directions
              </a>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_420px]">
        <section>
          <h2 className="font-display text-[24px] font-bold tracking-[-0.03em]">Choose a doctor</h2>
          <p className="text-[14.5px] text-muted">Consultation fees are paid at the hospital. No booking fee.</p>
          <div className="mt-4 space-y-3">
            {h.doctors.length === 0 && (
              <div className="rounded-[22px] bg-white p-6 text-center ring-1 ring-line">
                <p className="font-display text-[17px] font-bold">No doctors listed yet</p>
                <p className="mt-1 text-[14px] text-muted">This hospital is new on Vitalyn. Call the front desk to book for now.</p>
              </div>
            )}
            {h.doctors.map((d) => {
              const on = d.id === doctorId;
              return (
                <button
                  key={d.id}
                  onClick={() => setDoctorId(d.id)}
                  aria-pressed={on}
                  className={`flex w-full items-center gap-4 rounded-[22px] bg-white p-4 text-left ring-1 transition sm:p-5 ${on ? "ring-2 ring-blue" : "ring-line hover:ring-blue/30"}`}
                >
                  <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-sky font-display text-[18px] font-bold text-blue">
                    {d.name
                      .replace(/^Dr\.?\s*/, "")
                      .split(" ")
                      .map((w) => w[0])
                      .join("")
                      .slice(0, 2)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-[17.5px] font-bold tracking-[-0.02em] text-ink">{d.name}</span>
                    <span className="block text-[13.5px] text-muted">
                      {d.specialty} · {d.qualification} · {d.experienceYears} yrs
                    </span>
                    {d.registrationNo && <span className="block text-[12px] text-muted">Reg. no. {d.registrationNo}</span>}
                    <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-muted">
                      <span className="flex items-center gap-1.5">
                        <Clock className="size-3.5" /> {doctorHours(d)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Languages className="size-3.5" /> {d.languages.join(", ")}
                      </span>
                    </span>
                  </span>
                  <span className="hidden text-right sm:block">
                    <span className="block font-display text-[18px] font-bold text-ink">{inr(d.fee)}</span>
                    <span className={`mt-1 inline-flex h-9 items-center rounded-full px-4 text-[13.5px] font-semibold ${on ? "bg-blue text-white" : "bg-sky text-blue"}`}>{on ? "Selected" : "Book"}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {h.events.length > 0 && (
            <div className="mt-12">
              <h2 className="font-display text-[24px] font-bold tracking-[-0.03em]">Events at this hospital</h2>
              <div className="mt-4 grid gap-4 xl:grid-cols-2">
                {h.events.map((e) => (
                  <EventCard key={e.id} e={e} showHospital={false} />
                ))}
              </div>
            </div>
          )}
        </section>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <BookingPanel key={doctor?.id ?? "none"} doctor={doctor} hospitalSlug={h.slug} />
          <p className="mt-4 flex items-center gap-2 rounded-2xl bg-rose/6 px-4 py-3 text-[13px] text-rose">
            <Siren className="size-4 shrink-0" /> For emergencies, don&apos;t book. Call 112 or 108, or the hospital directly.
          </p>
        </aside>
      </div>
    </div>
  );
}

function BookingPanel({ doctor, hospitalSlug }: { doctor: Doctor | null; hospitalSlug: string }) {
  const { user, ready } = useAuth();
  const isPatient = user?.role === "USER";
  const fam = useProfiles(Boolean(isPatient));
  const [date, setDate] = useState(() => {
    const days = nextDays(7);
    return days.find((d) => !doctor || (doctor.workingDays.includes(new Date(`${d}T00:00:00`).getDay()) && !doctor.leaveDates?.includes(d))) ?? days[0];
  });
  const [time, setTime] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Appointment | null>(null);
  const [slotKey, setSlotKey] = useState(0);

  if (!doctor)
    return (
      <div className="rounded-[26px] bg-white p-6 ring-1 ring-line">
        <p className="font-display text-[20px] font-bold tracking-[-0.03em]">Book an appointment</p>
        <p className="mt-1 text-[14.5px] text-muted">Tap a doctor on the left to see their free times.</p>
        <div className="mt-5 grid grid-cols-4 gap-2 opacity-40" aria-hidden>
          {Array.from({ length: 8 }, (_, i) => (
            <span key={i} className="h-10 rounded-xl bg-mist" />
          ))}
        </div>
      </div>
    );

  if (done)
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-[26px] bg-white p-6 text-center ring-1 ring-line">
        <CheckCircle2 className="mx-auto size-12 text-signal" />
        <p className="mt-3 font-display text-[22px] font-bold tracking-[-0.03em]">Request sent</p>
        <p className="mt-1 text-[14.5px] text-muted">
          {done.status === "DOCTOR_APPROVED"
            ? "This doctor accepts bookings automatically. The hospital desk will confirm and give you a token."
            : `${doctor.name} will review your request. You'll see each update in your bookings.`}
        </p>
        <div className="mt-4 rounded-2xl bg-mist p-4 text-left text-[14px]">
          <p>
            <b>{dayLabel(done.date)}</b> at <b>{time12(done.time)}</b>
          </p>
          <p className="text-muted">
            {doctor.name} · for {done.patientName}
          </p>
          {done.approveBy && (
            <p className="mt-2 text-[12.5px] text-muted">
              If the hospital doesn&apos;t reply by {new Date(done.approveBy).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}, the request expires and we&apos;ll tell you.
            </p>
          )}
        </div>
        <div className="mt-5 grid gap-2">
          <ButtonLink href="/dashboard" arrow>
            See my bookings
          </ButtonLink>
          <Button variant="ghost" onClick={() => setDone(null)}>
            Book another
          </Button>
        </div>
      </motion.div>
    );

  const submit = async () => {
    const pid = profileId ?? defaultProfileId(fam.profiles);
    if (!time || !pid) return;
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ appointment: Appointment }>("/appointments", {
        method: "POST",
        body: { doctorId: doctor.id, date, time, profileId: pid, reason: reason || undefined },
      });
      setDone(r.appointment);
    } catch (e) {
      setError((e as Error).message);
      setTime(null);
      setSlotKey((k) => k + 1);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-[26px] bg-white p-5 ring-1 ring-line sm:p-6">
      <p className="font-mono text-[11.5px] uppercase tracking-[0.14em] text-blue">Booking with</p>
      <p className="mt-1 font-display text-[20px] font-bold tracking-[-0.03em]">{doctor.name}</p>
      <p className="text-[13.5px] text-muted">{doctor.specialty}</p>
      <div className="mt-3 flex items-center justify-between rounded-2xl bg-mist px-4 py-3 text-[13.5px]">
        <span className="text-ink-2">Consultation fee, paid at the hospital</span>
        <b className="font-display text-[16px]">{inr(doctor.fee)}</b>
      </div>

      <div className="mt-5">
        <SlotPicker
          key={slotKey}
          doctorId={doctor.id}
          workingDays={doctor.workingDays}
          leaveDates={doctor.leaveDates}
          date={date}
          time={time}
          onDate={(d) => {
            setDate(d);
            setTime(null);
          }}
          onTime={setTime}
        />
      </div>

      <AnimatePresence>
        {time && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <p className="mt-5 text-[13.5px] font-semibold text-ink-2">Who is this for?</p>
            {!ready ? null : !user ? (
              <div className="mt-2 rounded-2xl bg-sky p-4">
                <p className="text-[14px] text-blue-deep">Log in so we can send your token to you.</p>
                <div className="mt-3 flex gap-2">
                  <ButtonLink href={`/login?next=/hospitals/${hospitalSlug}`} size="sm">
                    Log in
                  </ButtonLink>
                  <ButtonLink href={`/register?next=/hospitals/${hospitalSlug}`} size="sm" variant="secondary">
                    Create account
                  </ButtonLink>
                </div>
              </div>
            ) : !isPatient ? (
              <p className="mt-2 rounded-2xl bg-mist p-4 text-[14px] text-muted">You&apos;re logged in as hospital or admin staff. Use a patient account to book.</p>
            ) : (
              <div className="mt-2 space-y-3">
                <ProfilePicker profiles={fam.profiles} max={fam.max} reload={fam.reload} value={profileId} onChange={setProfileId} />
                <Field label="Reason for visit" hint="Optional">
                  <input className={inputClass} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. knee pain for 2 weeks" />
                </Field>
                {error && <ErrorNote>{error}</ErrorNote>}
                <Button size="lg" className="w-full" arrow loading={busy} onClick={submit} disabled={!fam.profiles}>
                  Request {dayLabel(date)}, {time12(time)}
                </Button>
                <p className="text-center text-[12px] text-muted">Free to book. Cancel any time, or move it up to 2 hours before.</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
