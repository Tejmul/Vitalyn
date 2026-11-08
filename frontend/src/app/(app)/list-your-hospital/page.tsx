"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, LocateFixed, MapPin } from "lucide-react";
import { api } from "@/lib/api";
import { INDIAN_STATES, SPECIALTIES } from "@/lib/constants";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ChipSelect } from "@/components/ui/Chips";
import { ErrorNote, Field, inputClass } from "@/components/ui/Field";

const empty = {
  hospitalName: "",
  description: "",
  address: "",
  city: "",
  state: "Gujarat",
  pincode: "",
  phone: "",
  lat: "",
  lng: "",
  beds: "",
  emergency24x7: false,
  registrationNo: "",
  hfrId: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
};

function Section({ n, title, help, children }: { n: number; title: string; help?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[26px] bg-white p-5 ring-1 ring-line sm:p-7">
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-[13px] text-blue">Step {n}</span>
        <h2 className="font-display text-[21px] font-bold tracking-[-0.03em]">{title}</h2>
      </div>
      {help && <p className="mt-1 text-[14px] text-muted">{help}</p>}
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

export default function ListYourHospitalPage() {
  const [f, setF] = useState(empty);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [consent, setConsent] = useState(false);
  const [locating, setLocating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF((x) => ({ ...x, [k]: e.target.value }));

  const locate = () => {
    if (!("geolocation" in navigator)) return setError("This browser can't share location. Enter the coordinates instead");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setF((x) => ({ ...x, lat: p.coords.latitude.toFixed(6), lng: p.coords.longitude.toFixed(6) }));
        setLocating(false);
      },
      () => {
        setError("Location is turned off. Enter the coordinates from Google Maps instead");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15_000 },
    );
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ application: { hospitalName: string } }>("/onboarding/applications", {
        method: "POST",
        body: {
          ...f,
          lat: Number(f.lat),
          lng: Number(f.lng),
          beds: f.beds ? Number(f.beds) : undefined,
          specialties,
          consent,
        },
      });
      setDone(r.application.hospitalName);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (done)
    return (
      <div className="mx-auto max-w-[640px] rounded-[28px] bg-white p-8 text-center ring-1 ring-line">
        <CheckCircle2 className="mx-auto size-14 text-signal" />
        <h1 className="mt-4 font-display text-[30px] font-extrabold tracking-[-0.04em]">Application received</h1>
        <p className="mt-2 text-[16px] text-muted">
          Our team will check {done}&apos;s registration details. Once it&apos;s approved, the desk logs in with the mobile number you gave, using a one-time code.
        </p>
        <ButtonLink href="/" variant="secondary" className="mt-6">
          Back to home
        </ButtonLink>
      </div>
    );

  const mapsLink = f.lat && f.lng ? `https://www.google.com/maps?q=${f.lat},${f.lng}` : null;

  return (
    <div className="mx-auto max-w-[820px]">
      <p className="font-mono text-[11.5px] uppercase tracking-[0.14em] text-blue">For hospitals</p>
      <h1 className="mt-2 font-display text-[clamp(2rem,4vw,2.8rem)] font-extrabold leading-none tracking-[-0.045em]">List your hospital on Vitalyn</h1>
      <p className="mt-3 max-w-[620px] text-[16px] text-muted">
        Free during the pilot. We verify every hospital before patients can see it, so have your state registration number ready.
      </p>

      <form onSubmit={submit} className="mt-8 space-y-5">
        <Section n={1} title="About the hospital">
          <Field label="Hospital name">
            <input className={inputClass} required value={f.hospitalName} onChange={set("hospitalName")} placeholder="Sabarmati Care Hospital" />
          </Field>
          <Field label="What patients should know" hint="20–600 characters">
            <textarea className={`${inputClass} h-28 py-3`} required value={f.description} onChange={set("description")} placeholder="Beds, key departments, facilities. Facts only: no 'best' or 'guaranteed'." />
          </Field>
          <div>
            <p className="mb-2 text-[13.5px] font-semibold text-ink-2">Specialities</p>
            <ChipSelect options={SPECIALTIES} value={specialties} onChange={setSpecialties} allowCustom />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Front desk phone">
              <input className={inputClass} required type="tel" value={f.phone} onChange={set("phone")} placeholder="+91 79 4000 1100" />
            </Field>
            <Field label="Beds" hint="Optional">
              <input className={inputClass} inputMode="numeric" value={f.beds} onChange={(e) => setF((x) => ({ ...x, beds: e.target.value.replace(/\D/g, "").slice(0, 4) }))} />
            </Field>
            <div>
              <p className="mb-1.5 text-[13.5px] font-semibold text-ink-2">24×7 emergency</p>
              <div className="flex gap-2">
                {[true, false].map((v) => (
                  <button key={String(v)} type="button" onClick={() => setF((x) => ({ ...x, emergency24x7: v }))} className={`h-12 flex-1 rounded-xl text-[14px] font-semibold ${f.emergency24x7 === v ? "bg-ink text-white" : "bg-white ring-1 ring-line"}`}>
                    {v ? "Yes" : "No"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Section>

        <Section n={2} title="Where it is" help="Patients see how far you are from them, so the map pin must be on the hospital.">
          <Field label="Street address">
            <input className={inputClass} required value={f.address} onChange={set("address")} placeholder="Near Thaltej Cross Roads, SG Highway" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="City">
              <input className={inputClass} required value={f.city} onChange={set("city")} placeholder="Ahmedabad" />
            </Field>
            <Field label="State">
              <select className={inputClass} value={f.state} onChange={set("state")}>
                {INDIAN_STATES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="PIN code">
              <input className={inputClass} required inputMode="numeric" value={f.pincode} onChange={(e) => setF((x) => ({ ...x, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) }))} placeholder="380054" />
            </Field>
          </div>
          <div className="rounded-2xl bg-mist p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={locate} loading={locating}>
                <LocateFixed className="size-4" /> I&apos;m at the hospital: use this location
              </Button>
              {mapsLink && (
                <a href={mapsLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-blue hover:underline">
                  <MapPin className="size-4" /> Check the pin on Google Maps
                </a>
              )}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Field label="Latitude">
                <input className={inputClass} required inputMode="decimal" value={f.lat} onChange={set("lat")} placeholder="23.050400" />
              </Field>
              <Field label="Longitude">
                <input className={inputClass} required inputMode="decimal" value={f.lng} onChange={set("lng")} placeholder="72.517000" />
              </Field>
            </div>
            <p className="mt-2 text-[12.5px] text-muted">Not at the hospital? In Google Maps, long-press the hospital and copy the two numbers shown.</p>
          </div>
        </Section>

        <Section n={3} title="Registration" help="We check these before going live.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="State registration number" hint="Clinical Establishments Act">
              <input className={inputClass} required value={f.registrationNo} onChange={set("registrationNo")} placeholder="GJ/AMC/CEA/2019/0412" />
            </Field>
            <Field label="ABDM HFR ID" hint="Optional">
              <input className={inputClass} value={f.hfrId} onChange={set("hfrId")} placeholder="IN2410000187" />
            </Field>
          </div>
        </Section>

        <Section n={4} title="Who runs the Vitalyn desk" help="This person logs in with their mobile number and a one-time code.">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Name">
              <input className={inputClass} required value={f.contactName} onChange={set("contactName")} />
            </Field>
            <Field label="Mobile">
              <input className={inputClass} required type="tel" inputMode="tel" value={f.contactPhone} onChange={set("contactPhone")} placeholder="98765 43210" />
            </Field>
            <Field label="Email">
              <input className={inputClass} required type="email" value={f.contactEmail} onChange={set("contactEmail")} />
            </Field>
          </div>
        </Section>

        <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-white p-5 text-[14px] text-ink-2 ring-1 ring-line">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-[var(--blue)]" />
          <span>
            I&apos;m authorised to list this hospital, the details above are correct, and I agree to the{" "}
            <Link href="/privacy" target="_blank" className="font-semibold text-blue hover:underline">
              privacy notice
            </Link>
            . Hospital text must stick to facts: no cure claims, guarantees or superlatives.
          </span>
        </label>

        {error && <ErrorNote>{error}</ErrorNote>}
        <Button type="submit" size="lg" arrow loading={busy} disabled={!consent || specialties.length === 0} className="w-full sm:w-auto">
          Send application
        </Button>
      </form>
    </div>
  );
}
