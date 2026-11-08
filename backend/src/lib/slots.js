const toMin = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
const toHHMM = (min) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

/** All slot start times for a doctor on a given YYYY-MM-DD, or [] if they don't work that day or are on leave. */
export function slotsForDay(doctor, date, leaveDates = []) {
  if (leaveDates.includes(date)) return [];
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  if (!doctor.workingDays.includes(day)) return [];
  const out = [];
  for (let t = toMin(doctor.startTime); t + doctor.slotMinutes <= toMin(doctor.endTime); t += doctor.slotMinutes) {
    out.push(toHHMM(t));
  }
  return out;
}

const IST_MS = 5.5 * 3600_000;

/** Today's date in India (IST), as YYYY-MM-DD. */
export function todayIST() {
  return new Date(Date.now() + IST_MS).toISOString().slice(0, 10);
}

export function nowHHMMIST() {
  return new Date(Date.now() + IST_MS).toISOString().slice(11, 16);
}

/** YYYY-MM-DD n days after `date`. */
export function addDays(date, n) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** The real instant a slot starts (dates and times are stored in IST). */
export function slotStart(date, time) {
  return new Date(`${date}T${time}:00+05:30`);
}

export function isPast(date, time) {
  return date < todayIST() || (date === todayIST() && time <= nowHHMMIST());
}

/** Statuses that hold a slot (anything else frees it up). */
export const ACTIVE_STATUSES = ["PENDING", "DOCTOR_APPROVED", "CONFIRMED"];
