import type { AppointmentStatus, EventType } from "./types";

export const STATUS: Record<AppointmentStatus, { label: string; tone: "amber" | "blue" | "green" | "grey" | "red"; help: string }> = {
  PENDING: { label: "Waiting for approval", tone: "amber", help: "The hospital or the doctor will accept your request" },
  // Legacy status from the old two-step flow; treated like PENDING
  DOCTOR_APPROVED: { label: "Waiting for approval", tone: "amber", help: "The hospital or the doctor will accept your request" },
  CONFIRMED: { label: "Confirmed", tone: "green", help: "Show your token at the hospital desk" },
  COMPLETED: { label: "Arrived", tone: "grey", help: "Visit completed" },
  REJECTED: { label: "Not accepted", tone: "red", help: "Please pick another slot or doctor" },
  CANCELLED: { label: "Cancelled", tone: "grey", help: "This booking was cancelled" },
  NO_SHOW: { label: "Missed", tone: "grey", help: "Marked as not visited" },
  EXPIRED: { label: "Expired", tone: "red", help: "The hospital didn't reply in time, so the slot was released" },
};

export const EVENT_TYPE: Record<EventType, string> = {
  HEALTH_CAMP: "Health camp",
  WORKSHOP: "Workshop",
  DRIVE: "Drive",
  SCREENING: "Free screening",
  TALK: "Doctor talk",
};

export const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

/** "2026-11-09" -> Date at local midnight */
const d = (iso: string) => new Date(`${iso}T00:00:00`);

export function dayLabel(iso: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((d(iso).getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return d(iso).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

export function time12(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${ampm}`;
}

export function eventWhen(startsAt: string, endsAt: string) {
  const s = new Date(startsAt);
  const e = new Date(endsAt);
  const day = s.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
  const t = (x: Date) => x.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
  return `${day} · ${t(s)} – ${t(e)}`;
}

/** Next n days as YYYY-MM-DD in the user's local time. */
export function nextDays(n: number) {
  const out: string[] = [];
  const base = new Date();
  for (let i = 0; i < n; i++) {
    const x = new Date(base);
    x.setDate(base.getDate() + i);
    out.push(`${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`);
  }
  return out;
}

export const km = (n: number | null) => (n === null ? "" : n < 0.2 ? "Nearby" : n < 1 ? `${Math.round(n * 1000)} m` : `${n.toFixed(1)} km`);

export const tokenCode = (n: number | null, doctorName?: string) =>
  n === null ? "—" : `${(doctorName?.replace(/^Dr\.?\s*/, "")[0] ?? "A").toUpperCase()}-${String(n).padStart(2, "0")}`;

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "Mon–Sat · 9:00 AM – 1:00 PM" */
export function doctorHours(d: { workingDays: number[]; startTime: string; endTime: string }) {
  const days = [...d.workingDays].sort();
  const consecutive = days.length > 2 && days.every((v, i) => i === 0 || v === days[i - 1] + 1);
  const dayText = days.length === 0 ? "No OPD days set" : consecutive ? `${WEEKDAYS[days[0]]}–${WEEKDAYS[days[days.length - 1]]}` : days.map((x) => WEEKDAYS[x]).join(", ");
  return `${dayText} · ${time12(d.startTime)} – ${time12(d.endTime)}`;
}

export { WEEKDAYS };

/** "Today 4:15 PM", "Tomorrow 9:00 AM", "Wed 11 Nov, 10:30 AM" from an ISO instant. */
export function nextSlotLabel(iso: string | null | undefined) {
  if (!iso) return null;
  const d = new Date(iso);
  const local = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return `${dayLabel(local)}, ${time12(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`)}`;
}
