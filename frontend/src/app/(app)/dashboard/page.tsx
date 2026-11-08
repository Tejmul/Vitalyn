"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { PatientDashboard } from "@/components/dashboard/PatientDashboard";
import { ManageDashboard } from "@/components/dashboard/ManageDashboard";
import { AdminDashboard } from "@/components/dashboard/AdminDashboard";

export default function DashboardPage() {
  const { user, ready, signedOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Arrived without a session: go log in. Just logged out: the header sends them home instead.
    if (ready && !user && !signedOut) router.replace("/login?next=/dashboard");
  }, [ready, user, signedOut, router]);

  if (!ready || !user) return <div className="h-64 animate-pulse rounded-[28px] bg-white ring-1 ring-line" />;
  if (user.role === "ADMIN") return <AdminDashboard />;
  if (user.role === "HOSPITAL" || user.role === "DOCTOR") return <ManageDashboard role={user.role} />;
  return <PatientDashboard name={user.name} />;
}
