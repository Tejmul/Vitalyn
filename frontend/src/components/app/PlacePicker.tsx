"use client";

import { LocateFixed, MapPin } from "lucide-react";
import { CITIES, type Place } from "@/lib/location";

/** Big-button location chooser: GPS or one tap on a city. */
export function PlacePicker({ place, setPlace, locate, locating, error }: { place: Place; setPlace: (p: Place) => void; locate: () => void; locating: boolean; error: string | null }) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={locate}
          className={`inline-flex h-10 items-center gap-2 rounded-full px-4 text-[14px] font-semibold transition ${
            place.source === "device" ? "bg-blue text-white" : "bg-white text-blue ring-1 ring-blue/30 hover:bg-sky"
          }`}
        >
          <LocateFixed className={`size-4 ${locating ? "animate-spin" : ""}`} />
          {locating ? "Finding you…" : place.source === "device" ? "Using your location" : "Use my location"}
        </button>
        {CITIES.map((c) => {
          const on = place.source === "city" && place.label === c.label;
          return (
            <button
              key={c.label}
              onClick={() => setPlace(c)}
              aria-pressed={on}
              className={`inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-[14px] font-medium transition ${on ? "bg-ink text-white" : "bg-white text-ink-2 ring-1 ring-line hover:ring-ink/30"}`}
            >
              {on && <MapPin className="size-3.5" />}
              {c.label}
            </button>
          );
        })}
      </div>
      {error && <p className="mt-2 text-[13px] text-rose">{error}</p>}
    </div>
  );
}
