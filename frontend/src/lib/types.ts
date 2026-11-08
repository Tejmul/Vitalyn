export type Role = "USER" | "HOSPITAL" | "DOCTOR" | "ADMIN";
export type AppointmentStatus = "PENDING" | "DOCTOR_APPROVED" | "CONFIRMED" | "COMPLETED" | "REJECTED" | "CANCELLED" | "NO_SHOW" | "EXPIRED";
export type EventType = "HEALTH_CAMP" | "WORKSHOP" | "DRIVE" | "SCREENING" | "TALK";

export interface User {
  id: string;
  name: string;
  email: string;
  username: string;
  phone: string | null;
  role: Role;
  hospitalId: string | null;
  hospital?: { id: string; name: string; slug: string } | null;
  consentAt?: string | null;
}

export type Gender = "FEMALE" | "MALE" | "OTHER";

export interface Profile {
  id: string;
  name: string;
  age: number | null;
  gender: Gender | null;
  relation: string;
  abhaNumber: string | null;
}

export interface Notice {
  id: string;
  title: string;
  body: string;
  appointmentId: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface Hospital {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  lat: number;
  lng: number;
  specialties: string[];
  rating: number;
  reviewCount: number;
  beds: number;
  emergency24x7: boolean;
  tone: string;
  imageUrl: string | null;
  registrationNo?: string | null;
  hfrId?: string | null;
  nextSlotAt?: string | null;
  distanceKm: number | null;
  etaMinutes: number | null;
  sponsored: boolean;
  highlight?: string | null;
  _count?: { doctors: number; events: number };
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  qualification: string;
  experienceYears: number;
  fee: number;
  languages: string[];
  workingDays: number[];
  startTime: string;
  endTime: string;
  slotMinutes: number;
  autoApprove: boolean;
  registrationNo: string | null;
  active: boolean;
  leaveDates?: string[];
  leaves?: { id: string; date: string; reason: string | null }[];
}

export interface HospitalEvent {
  id: string;
  title: string;
  description: string;
  type: EventType;
  startsAt: string;
  endsAt: string;
  venue: string;
  isFree: boolean;
  seats: number | null;
  hospital?: { id: string; name: string; slug: string; city: string; tone: string };
}

export interface Appointment {
  id: string;
  date: string;
  time: string;
  reason: string | null;
  patientName: string;
  patientAge: number | null;
  status: AppointmentStatus;
  tokenNumber: number | null;
  note: string | null;
  approveBy: string | null;
  paidAt: string | null;
  walkIn: boolean;
  walkInPhone: string | null;
  createdAt: string;
  profile?: { id?: string; name?: string; relation: string } | null;
  doctor: { id: string; name: string; specialty: string; fee?: number };
  hospital?: { id: string; name: string; slug: string; address: string; city: string; phone: string; tone: string };
  user?: { id: string; name: string; phone: string | null; email: string };
}

export interface Promotion {
  id: string;
  title: string;
  highlight: string;
  priority: number;
  startsAt: string;
  endsAt: string;
  active: boolean;
  hospital: { id: string; name: string; city: string; slug: string };
}

export interface HospitalApplication {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  hospitalName: string;
  description: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  lat: number;
  lng: number;
  specialties: string[];
  beds: number | null;
  emergency24x7: boolean;
  registrationNo: string;
  hfrId: string | null;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  reviewNote: string | null;
  reviewedAt: string | null;
  hospitalId: string | null;
  createdAt: string;
}
