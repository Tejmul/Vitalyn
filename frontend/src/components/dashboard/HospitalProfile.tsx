"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { SPECIALTIES } from "@/lib/constants";
import type { Hospital } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { ChipSelect } from "@/components/ui/Chips";
import { ErrorNote, Field, inputClass } from "@/components/ui/Field";
import { Panel } from "./bits";

function ProfileForm({ h, onSaved }: { h: Hospital; onSaved: () => void }) {
  const [tagline, setTagline] = useState(h.tagline ?? "");
  const [description, setDescription] = useState(h.description);
  const [phone, setPhone] = useState(h.phone);
  const [beds, setBeds] = useState(String(h.beds));
  const [emergency, setEmergency] = useState(h.emergency24x7);
  const [specialties, setSpecialties] = useState(h.specialties);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await api("/manage/hospital", { method: "PATCH", body: { tagline: tagline || null, description, phone, beds: Number(beds || 0), emergency24x7: emergency, specialties } });
      setSaved(true);
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <Field label="One-line summary" hint="Shown on hospital cards">
        <input className={inputClass} value={tagline} onChange={(e) => setTagline(e.target.value)} maxLength={80} placeholder="e.g. Cataract, retina and glaucoma care" />
      </Field>
      <Field label="About the hospital">
        <textarea className={`${inputClass} h-28 py-3`} value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Front desk phone">
          <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <Field label="Beds">
          <input className={inputClass} inputMode="numeric" value={beds} onChange={(e) => setBeds(e.target.value.replace(/\D/g, "").slice(0, 4))} />
        </Field>
        <div>
          <p className="mb-1.5 text-[13.5px] font-semibold text-ink-2">24×7 emergency</p>
          <div className="flex gap-2">
            {[true, false].map((v) => (
              <button key={String(v)} type="button" onClick={() => setEmergency(v)} className={`h-12 flex-1 rounded-xl text-[14px] font-semibold ${emergency === v ? "bg-ink text-white" : "bg-white ring-1 ring-line"}`}>
                {v ? "Yes" : "No"}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div>
        <p className="mb-2 text-[13.5px] font-semibold text-ink-2">Specialities</p>
        <ChipSelect options={SPECIALTIES} value={specialties} onChange={setSpecialties} allowCustom />
      </div>
      {error && <ErrorNote>{error}</ErrorNote>}
      <div className="flex items-center gap-3">
        <Button onClick={save} loading={busy} disabled={specialties.length === 0}>
          Save hospital details
        </Button>
        {saved && <span className="text-[13.5px] font-semibold text-signal">Saved</span>}
      </div>
      <p className="text-[12.5px] text-muted">Name, address, map location and registration IDs are changed by the Vitalyn team. Facts only: words like &quot;best&quot; or &quot;guaranteed&quot; are blocked.</p>
    </div>
  );
}

export function HospitalProfile() {
  const req = useApi<{ hospital: Hospital }>("/manage/hospital");
  return (
    <Panel title="Hospital details">
      {req.data ? <ProfileForm key={req.data.hospital.id} h={req.data.hospital} onSaved={req.reload} /> : <div className="h-40 animate-pulse rounded-2xl bg-mist" />}
    </Panel>
  );
}
