"use client";

import { Fragment } from "react";
import { useApi } from "@/lib/useApi";
import { usePlace } from "@/lib/location";
import type { Hospital } from "@/lib/types";
import { Button, ButtonLink } from "@/components/ui/Button";
import { HospitalCard, HospitalCardSkeleton } from "@/components/app/HospitalCard";
import { PlacePicker } from "@/components/app/PlacePicker";
import { Eyebrow, Reveal } from "./Reveal";

const RADIUS_KM = 50;

export function NearYou() {
  const loc = usePlace();
  const recs = useApi<{ recommendations: Hospital[] }>("/hospitals/recommendations", { lat: loc.place.lat, lng: loc.place.lng, radiusKm: RADIUS_KM });
  const items = recs.data?.recommendations ?? null;
  const error = recs.error;

  return (
    <section id="near-you" className="mx-auto max-w-[1240px] px-5 py-24 md:py-32">
      <Reveal className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <Eyebrow>Recommended near you</Eyebrow>
          <h2 className="mt-4 max-w-[640px] font-display text-[clamp(2.2rem,4.4vw,3.6rem)] font-extrabold leading-[0.95] tracking-[-0.045em]">
            Good hospitals, sorted by how close they are.
          </h2>
        </div>
        <ButtonLink href="/hospitals" variant="secondary" arrow>
          See all hospitals
        </ButtonLink>
      </Reveal>

      <Reveal delay={0.1} className="mt-8">
        <PlacePicker {...loc} />
      </Reveal>

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {error ? (
          <div className="col-span-full rounded-3xl bg-mist p-10 text-center">
            <p className="font-semibold text-ink">{error}</p>
            <Button className="mt-4" variant="secondary" onClick={recs.reload}>
              Try again
            </Button>
          </div>
        ) : items === null ? (
          Array.from({ length: 6 }, (_, i) => <HospitalCardSkeleton key={i} />)
        ) : (
          items.map((h, i) => {
            const firstFar = (h.distanceKm ?? 0) > RADIUS_KM && (i === 0 || (items[i - 1].distanceKm ?? 0) <= RADIUS_KM);
            return (
              <Fragment key={h.id}>
                {firstFar && (
                  <p className="col-span-full mt-4 flex items-center gap-4 font-mono text-[12px] uppercase tracking-[0.14em] text-muted">
                    Further away
                    <span className="h-px flex-1 bg-line" />
                  </p>
                )}
                <Reveal delay={0.06 * (i % 3)}>
                  <HospitalCard h={h} showHighlight />
                </Reveal>
              </Fragment>
            );
          })
        )}
      </div>
      <p className="mt-6 max-w-[760px] text-[13px] text-muted">Ranked by distance, rating and the soonest free slot. Sponsored hospitals are always labelled; tap the label to see the rules. Distances are straight-line; travel times are estimates.</p>
    </section>
  );
}
