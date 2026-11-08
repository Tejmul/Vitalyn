"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { LANGUAGES, SPECIALTIES } from "@/lib/constants";
import type { Doctor } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { ChipSelect } from "@/components/ui/Chips";
import { ErrorNote, Field, inputClass } from "@/components/ui/Field";

/** Add a doctor, or edit one's profile. Schedules are edited separately ("Edit hours"). */
export function DoctorForm({ doctor, specialties, onSaved, onCancel }: { doctor?: Doctor; specialties: string[]; onSaved: () => void; onCancel: () => void }) {
  const [name, setName] = useState(doctor?.name.replace(/^Dr\.?\s*/, "") ?? "");
  const [specialty, setSpecialty] = useState<string[]>(doctor ? [doctor.specialty] : []);
  const [qualification, setQualification] = useState(doctor?.qualification ?? "");
  const [experienceYears, setExperience] = useState(doctor ? String(doctor.experienceYears) : "");
  const [fee, setFee] = useState(doctor ? String(doctor.fee) : "");
  const [languages, setLanguages] = useState<string[]>(doctor?.languages ?? ["English", "Hindi"]);
  const [registrationNo, setRegistrationNo] = useState(doctor?.registrationNo ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const options = [...new Set([...specialties, ...SPECIALTIES])];

  const save = async () => {
    setBusy(true);
    setError(null);
    const body = { name, specialty: specialty[0], qualification, experienceYears: Number(experienceYears || 0), fee: Number(fee || 0), languages, registrationNo };
    try {
      if (doctor) await api(`/manage/doctors/${doctor.id}`, { method: "PATCH", body });
      else await api("/manage/doctors", { method: "POST", body });
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3 space-y-4 rounded-2xl bg-mist p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Doctor's name">
          <div className="flex items-center rounded-xl bg-white ring-1 ring-line focus-within:ring-2 focus-within:ring-blue">
            <span className="pl-4 text-[15.5px] text-muted">Dr.</span>
            <input className="h-12 w-full rounded-xl bg-transparent px-2 text-[15.5px] outline-none" value={name} onChange={(e) => setName(e.target.value)} placeholder="Kavita Shah" />
          </div>
        </Field>
        <Field label="Qualifications">
          <input className={inputClass} value={qualification} onChange={(e) => setQualification(e.target.value)} placeholder="MBBS, MD (Medicine)" />
        </Field>
      </div>
      <div>
        <p className="mb-2 text-[13px] font-semibold text-ink-2">Speciality</p>
        <ChipSelect options={options} value={specialty} onChange={setSpecialty} single allowCustom />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Years of experience">
          <input className={inputClass} inputMode="numeric" value={experienceYears} onChange={(e) => setExperience(e.target.value.replace(/\D/g, "").slice(0, 2))} />
        </Field>
        <Field label="Consultation fee (₹)">
          <input className={inputClass} inputMode="numeric" value={fee} onChange={(e) => setFee(e.target.value.replace(/\D/g, "").slice(0, 6))} />
        </Field>
        <Field label="Council / HPR reg. no.">
          <input className={inputClass} value={registrationNo} onChange={(e) => setRegistrationNo(e.target.value)} placeholder="G-12345" />
        </Field>
      </div>
      <div>
        <p className="mb-2 text-[13px] font-semibold text-ink-2">Languages spoken</p>
        <ChipSelect options={LANGUAGES} value={languages} onChange={setLanguages} />
      </div>
      {error && <ErrorNote>{error}</ErrorNote>}
      <div className="flex gap-2">
        <Button onClick={save} loading={busy} disabled={!name.trim() || specialty.length === 0}>
          {doctor ? "Save details" : "Add doctor"}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
      {!doctor && <p className="text-[12.5px] text-muted">New doctors start with Mon–Sat, 9 AM–1 PM, 15-minute slots, auto-confirm on. Change it with &quot;Edit hours&quot;.</p>}
    </div>
  );
}
