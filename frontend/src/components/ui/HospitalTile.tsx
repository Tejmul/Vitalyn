import Image from "next/image";
import { clsx } from "clsx";

/** Hospital photo when we have one, otherwise a calm tile built from the hospital's tone and initials. */
export function HospitalTile({ name, tone, imageUrl, className, sizes = "(max-width: 768px) 100vw, 33vw" }: { name: string; tone: string; imageUrl: string | null; className?: string; sizes?: string }) {
  const initials = name
    .replace(/&/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("");
  return (
    <div className={clsx("relative overflow-hidden bg-mist", className)} style={{ ["--tone" as string]: tone }}>
      {imageUrl ? (
        <Image src={imageUrl} alt="" fill sizes={sizes} className="object-cover" />
      ) : (
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${tone} 0%, color-mix(in oklab, ${tone} 55%, #0a1630) 100%)` }}>
          <svg className="absolute inset-0 size-full opacity-20" aria-hidden>
            <defs>
              <pattern id={`g-${initials}`} width="22" height="22" patternUnits="userSpaceOnUse">
                <path d="M22 0H0V22" fill="none" stroke="white" strokeWidth=".6" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#g-${initials})`} />
          </svg>
          <span className="absolute bottom-3 left-4 font-display text-5xl font-extrabold tracking-[-0.06em] text-white/90">{initials}</span>
          <svg viewBox="0 0 24 24" className="absolute right-4 top-4 size-6 text-white/70" fill="none" aria-hidden>
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
        </div>
      )}
    </div>
  );
}
