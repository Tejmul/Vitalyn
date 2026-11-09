"use client";

import { useState } from "react";
import { BadgeCheck, Star } from "lucide-react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import type { PublicReview } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { ErrorNote, inputClass } from "@/components/ui/Field";

export function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} style={{ width: size, height: size }} className={n <= value ? "fill-amber text-amber" : "text-line"} aria-hidden />
      ))}
    </span>
  );
}

const LABEL = ["", "Poor", "Below average", "OK", "Good", "Excellent"];

/** Rate a visit: five big star buttons, an optional comment and consent to show it publicly. */
export function ReviewForm({ appointmentId, onDone }: { appointmentId: string; onDone: () => void }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await api(`/appointments/${appointmentId}/review`, { method: "POST", body: { rating, comment, consent } });
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3 space-y-3 rounded-2xl bg-mist p-4">
      <div className="flex flex-wrap items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} star${n > 1 ? "s" : ""}`} aria-pressed={rating === n} className="grid size-11 place-items-center rounded-full hover:bg-white">
            <Star className={`size-7 ${n <= rating ? "fill-amber text-amber" : "text-muted/40"}`} />
          </button>
        ))}
        {rating > 0 && <span className="ml-2 text-[14px] font-semibold text-ink-2">{LABEL[rating]}</span>}
      </div>
      <textarea className={`${inputClass} h-20 py-3`} maxLength={500} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="What went well, what could be better? (optional)" />
      <label className="flex cursor-pointer items-start gap-3 text-[13.5px] text-ink-2">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-[var(--blue)]" />
        <span>Show my review publicly with my first name and initial. Please don&apos;t include medical details.</span>
      </label>
      {error && <ErrorNote>{error}</ErrorNote>}
      <Button onClick={submit} loading={busy} disabled={rating === 0 || !consent}>
        Post review
      </Button>
    </div>
  );
}

/** Verified reviews on a hospital page. */
export function HospitalReviews({ slug }: { slug: string }) {
  const req = useApi<{ rating: number; count: number; reviews: PublicReview[] }>(`/hospitals/${slug}/reviews`);
  const d = req.data;
  return (
    <div className="mt-12">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-[24px] font-bold tracking-[-0.03em]">Verified reviews</h2>
        {d && d.count > 0 && (
          <span className="flex items-center gap-2 text-[14.5px]">
            <Stars value={Math.floor(d.rating)} /> <b>{d.rating.toFixed(1)}</b> <span className="text-muted">from {d.count} visit{d.count === 1 ? "" : "s"}</span>
          </span>
        )}
      </div>
      <p className="mt-1 flex items-center gap-1.5 text-[13.5px] text-muted">
        <BadgeCheck className="size-4 text-signal" /> Only patients whose visit the hospital marked as arrived can review.
      </p>
      {!d ? (
        <div className="mt-4 h-24 animate-pulse rounded-2xl bg-white ring-1 ring-line" />
      ) : d.reviews.length === 0 ? (
        <p className="mt-4 rounded-[22px] bg-white p-6 text-center text-[14.5px] text-muted ring-1 ring-line">No reviews yet.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {d.reviews.map((r) => (
            <li key={r.id} className="rounded-[22px] bg-white p-5 ring-1 ring-line">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <Stars value={r.rating} />
                  <b className="text-[14.5px]">{r.displayName}</b>
                  <span className="rounded-full bg-signal/10 px-2 py-0.5 text-[11px] font-semibold text-signal">Verified visit</span>
                </span>
                <span className="text-[12.5px] text-muted">
                  {r.doctorName ? `${r.doctorName} · ` : ""}
                  {new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </div>
              {r.comment && <p className="mt-2 text-[14.5px] text-ink-2">{r.comment}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
