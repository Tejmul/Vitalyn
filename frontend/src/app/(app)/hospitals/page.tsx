"use client";

import { Suspense, useEffect, useState } from "react";
import { useApi } from "@/lib/useApi";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { api } from "@/lib/api";
import { usePlace } from "@/lib/location";
import type { Hospital } from "@/lib/types";
import { HospitalCard, HospitalCardSkeleton } from "@/components/app/HospitalCard";
import { PlacePicker } from "@/components/app/PlacePicker";
import { Button } from "@/components/ui/Button";

function HospitalsInner() {
  const params = useSearchParams();
  const loc = usePlace();
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [specialty, setSpecialty] = useState<string | null>(null);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const { locate } = loc;

  // "Find hospitals near me" from the landing page asks for location straight away
  useEffect(() => {
    if (params.get("near") === "1") locate();
  }, [params, locate]);

  useEffect(() => {
    api<{ specialties: string[] }>("/hospitals/specialties").then((r) => setSpecialties(r.specialties)).catch(() => {});
  }, []);

  const list = useApi<{ hospitals: Hospital[] }>("/hospitals", { lat: loc.place.lat, lng: loc.place.lng, q: query, specialty });
  const items = list.data?.hospitals ?? null;
  const error = list.error;

  return (
    <div>
      <h1 className="font-display text-[clamp(2rem,4vw,2.8rem)] font-extrabold tracking-[-0.045em] text-ink">Hospitals near {loc.place.source === "device" ? "you" : loc.place.label}</h1>
      <p className="mt-1 text-[15.5px] text-muted">Closest first. Tap a hospital to see its doctors and free slots.</p>

      <div className="mt-6 space-y-4 rounded-[24px] bg-white p-4 ring-1 ring-line sm:p-5">
        <PlacePicker {...loc} />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setQuery(q.trim());
          }}
          className="flex gap-2"
        >
          <label className="relative flex-1">
            <span className="sr-only">Search hospitals, areas, PIN codes or specialities</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search a hospital, area, PIN code or speciality"
              className="h-12 w-full rounded-full bg-mist pl-12 pr-4 text-[15.5px] outline-none ring-blue focus:bg-white focus:ring-2"
            />
          </label>
          <Button type="submit" className="h-12">
            Search
          </Button>
        </form>
        <div className="flex flex-wrap gap-2">
          {["All", ...specialties].map((s) => {
            const on = (s === "All" && !specialty) || s === specialty;
            return (
              <button
                key={s}
                onClick={() => setSpecialty(s === "All" ? null : s)}
                aria-pressed={on}
                className={`h-9 rounded-full px-4 text-[13.5px] font-semibold transition ${on ? "bg-blue text-white" : "bg-mist text-ink-2 hover:bg-sky hover:text-blue"}`}
              >
                {s}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {error ? (
          <div className="col-span-full rounded-3xl bg-white p-10 text-center ring-1 ring-line">
            <p className="font-semibold">{error}</p>
            <Button variant="secondary" className="mt-4" onClick={list.reload}>
              Try again
            </Button>
          </div>
        ) : items === null ? (
          Array.from({ length: 6 }, (_, i) => <HospitalCardSkeleton key={i} />)
        ) : items.length === 0 ? (
          <div className="col-span-full rounded-3xl bg-white p-10 text-center ring-1 ring-line">
            <p className="font-display text-xl font-bold">No hospitals match that</p>
            <p className="mt-1 text-muted">Try a different speciality, or clear your search.</p>
            <Button
              variant="secondary"
              className="mt-4"
              onClick={() => {
                setQ("");
                setQuery("");
                setSpecialty(null);
              }}
            >
              Show all hospitals
            </Button>
          </div>
        ) : (
          items.map((h) => <HospitalCard key={h.id} h={h} />)
        )}
      </div>
    </div>
  );
}

export default function HospitalsPage() {
  return (
    <Suspense>
      <HospitalsInner />
    </Suspense>
  );
}
