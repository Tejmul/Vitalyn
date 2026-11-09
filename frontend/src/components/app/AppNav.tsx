"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CalendarCheck2, Building2, LayoutDashboard, LogOut, Megaphone } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { ButtonLink } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth";

/** The quiet header used once you're inside the app. Same brand, no theatrics. */
export function AppNav() {
  const { user, logout } = useAuth();
  const path = usePathname();
  const router = useRouter();

  const links = !user
    ? [{ href: "/hospitals", label: "Hospitals", icon: Building2 }]
    : user.role === "USER"
      ? [
          { href: "/hospitals", label: "Book", icon: Building2 },
          { href: "/dashboard", label: "My bookings", icon: CalendarCheck2 },
        ]
      : user.role === "ADMIN"
        ? [
            { href: "/dashboard", label: "Admin", icon: Megaphone },
            { href: "/hospitals", label: "Hospitals", icon: Building2 },
          ]
        : [
            { href: "/dashboard", label: "Bookings desk", icon: LayoutDashboard },
            { href: "/hospitals", label: "Hospitals", icon: Building2 },
          ];

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between gap-4 px-5">
        <div className="flex items-center gap-8">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex" aria-label="App">
            {links.map((l) => {
              const on = path === l.href || (l.href !== "/" && path.startsWith(l.href));
              return (
                <Link key={l.href} href={l.href} className={`inline-flex h-10 items-center gap-2 rounded-full px-4 text-[14.5px] font-semibold transition ${on ? "bg-sky text-blue" : "text-ink-2 hover:bg-mist"}`}>
                  <l.icon className="size-4" />
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>
        {user ? (
          <div className="flex items-center gap-2">
            <span className="hidden text-right sm:block">
              <span className="block text-[14px] font-semibold leading-tight text-ink">{user.name}</span>
              <span className="block text-[12px] leading-tight text-muted">{user.role === "HOSPITAL" ? (user.staffRole === "RECEPTION" ? "Reception" : "Hospital manager") : { USER: "Patient", HOSPITAL: "Hospital desk", DOCTOR: "Doctor", ADMIN: "Platform admin" }[user.role]}</span>
            </span>
            <button
              onClick={async () => {
                await logout();
                router.push("/");
              }}
              className="inline-flex h-10 items-center gap-2 rounded-full px-3 text-[14px] font-semibold text-muted ring-1 ring-line hover:text-rose hover:ring-rose/30"
            >
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Log out</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <ButtonLink href="/login" variant="ghost" size="sm">
              Log in
            </ButtonLink>
            <ButtonLink href="/register" size="sm">
              Sign up free
            </ButtonLink>
          </div>
        )}
      </div>
      {/* Mobile tab bar */}
      {links.length > 1 && (
        <nav className="flex gap-1 border-t border-line px-3 py-2 md:hidden" aria-label="App mobile">
          {links.map((l) => {
            const on = path.startsWith(l.href);
            return (
              <Link key={l.href} href={l.href} className={`flex h-10 flex-1 items-center justify-center gap-2 rounded-full text-[14px] font-semibold ${on ? "bg-sky text-blue" : "text-ink-2"}`}>
                <l.icon className="size-4" />
                {l.label}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}
