"use client";

import { Heart } from "lucide-react";
import { useSavedHospitals } from "@/lib/saved";

/** Heart toggle for "My hospitals". Only shown to logged-in patients. */
export function SaveButton({ hospitalId, variant = "icon", className = "" }: { hospitalId: string; variant?: "icon" | "pill"; className?: string }) {
  const { canSave, saved, toggle } = useSavedHospitals();
  if (!canSave) return null;
  const on = saved.has(hospitalId);
  const label = on ? "Saved to My hospitals" : "Save to My hospitals";
  if (variant === "pill")
    return (
      <button
        type="button"
        onClick={() => toggle(hospitalId)}
        aria-pressed={on}
        className={`inline-flex h-11 items-center gap-2 rounded-full px-5 text-[14.5px] font-semibold ring-1 transition ${on ? "bg-rose/8 text-rose ring-rose/30" : "bg-white text-ink ring-line hover:ring-rose/40"} ${className}`}
      >
        <Heart className={`size-4 ${on ? "fill-current" : ""}`} /> {on ? "Saved" : "Save"}
      </button>
    );
  return (
    <button
      type="button"
      onClick={() => toggle(hospitalId)}
      aria-pressed={on}
      aria-label={label}
      title={label}
      className={`z-10 grid size-9 place-items-center rounded-full bg-white/95 shadow-sm ring-1 ring-line backdrop-blur transition hover:scale-105 ${on ? "text-rose" : "text-ink-2"} ${className}`}
    >
      <Heart className={`size-4 ${on ? "fill-current" : ""}`} />
    </button>
  );
}
