"use client";

import { useState } from "react";
import Link from "next/link";
import { Clock, Info, Navigation, Star } from "lucide-react";
import type { Hospital } from "@/lib/types";
import { km, nextSlotLabel } from "@/lib/format";
import { HospitalTile } from "@/components/ui/HospitalTile";
import { SaveButton } from "./SaveButton";

/** Why a sponsored card is where it is. Same wording everywhere a sponsored card appears. */
export const SPONSORED_WHY =
  "This hospital paid to be shown higher. It can move up at most 3 places, only within 10 km of you, and no more than 2 sponsored hospitals appear in the top 5. Everything else is ranked by distance, rating and the soonest free slot.";

function SponsoredWhy() {
  const [open, setOpen] = useState(false);
  return (
    <div className="absolute left-3 top-3 z-10">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-ink-2 ring-1 ring-line backdrop-blur hover:text-blue"
      >
        Sponsored <Info className="size-3" aria-label="Why am I seeing this?" />
      </button>
      {open && (
        <div role="note" className="mt-2 w-[260px] rounded-2xl bg-white p-3 text-[12.5px] leading-relaxed text-ink-2 shadow-[0_20px_40px_-20px_rgba(10,22,48,.4)] ring-1 ring-line">
          <p className="mb-1 font-semibold text-ink">Why am I seeing this?</p>
          {SPONSORED_WHY}
        </div>
      )}
    </div>
  );
}

/**
 * The whole card is clickable through a stretched link, so the "Sponsored · why?" button
 * can live inside it without nesting a button in a link.
 */
export function HospitalCard({ h, showHighlight }: { h: Hospital; showHighlight?: boolean }) {
  const next = nextSlotLabel(h.nextSlotAt);
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-[26px] bg-white ring-1 ring-line transition duration-500 ease-out-expo hover:-translate-y-1 hover:shadow-[0_30px_60px_-30px_rgba(10,22,48,.35)] hover:ring-blue/25">
      <div className="relative overflow-hidden">
        <HospitalTile name={h.name} tone={h.tone} imageUrl={h.imageUrl} className="aspect-[16/10] transition-transform duration-700 ease-out-expo group-hover:scale-[1.03]" />
        {h.distanceKm !== null && (
          <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 font-mono text-[12px] font-medium text-ink shadow-sm">
            <Navigation className="size-3 text-blue" />
            {km(h.distanceKm)}
            {h.etaMinutes !== null && h.etaMinutes <= 120 && ` · ${h.etaMinutes} min`}
          </span>
        )}
      </div>
      {h.sponsored && <SponsoredWhy />}
      <SaveButton hospitalId={h.id} className="absolute right-3 top-3" />
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-[19px] font-bold leading-tight tracking-[-0.03em] text-ink">
            <Link href={`/hospitals/${h.slug}`} className="after:absolute after:inset-0 after:content-['']">
              {h.name}
            </Link>
          </h3>
          <span className="flex shrink-0 items-center gap-1 text-[13.5px] font-semibold text-ink">
            {h.reviewCount > 0 ? (
              <>
                <Star className="size-3.5 fill-amber text-amber" />
                {h.rating.toFixed(1)}
              </>
            ) : (
              <span className="rounded-full bg-sky px-2 py-0.5 text-[11.5px] text-blue">New</span>
            )}
          </span>
        </div>
        <p className="mt-1 text-[13.5px] text-muted">
          {h.address.split(",")[0]}, {h.city}
          {h.accreditations && h.accreditations.length > 0 && <span className="ml-2 font-semibold text-signal">{h.accreditations.join(" · ")}</span>}
        </p>
        {next && (
          <p className="mt-2 flex items-center gap-1.5 text-[13px] font-medium text-signal">
            <Clock className="size-3.5" /> Next free: {next}
          </p>
        )}
        {showHighlight && h.highlight ? (
          <p className="mt-3 rounded-xl bg-sky px-3 py-2 text-[13.5px] font-medium text-blue-deep">{h.highlight}</p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {h.specialties.slice(0, 3).map((s) => (
              <span key={s} className="rounded-full bg-mist px-2.5 py-1 text-[12px] font-medium text-ink-2">
                {s}
              </span>
            ))}
          </div>
        )}
        <span className="mt-auto flex items-center justify-between pt-5 text-[14.5px] font-semibold text-blue">
          See doctors & book
          <span className="grid size-9 place-items-center rounded-full bg-blue text-white transition-transform duration-500 ease-out-expo group-hover:translate-x-1">→</span>
        </span>
      </div>
    </article>
  );
}

export function HospitalCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[26px] bg-white ring-1 ring-line">
      <div className="aspect-[16/10] animate-pulse bg-mist" />
      <div className="space-y-3 p-5">
        <div className="h-5 w-2/3 animate-pulse rounded bg-mist" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-mist" />
        <div className="h-9 w-full animate-pulse rounded-xl bg-mist" />
      </div>
    </div>
  );
}
