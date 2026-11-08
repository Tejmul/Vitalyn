"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { ButtonLink } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth";

const LINKS = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#near-you", label: "Hospitals near you" },
  { href: "#events", label: "Health camps" },
  { href: "#for-hospitals", label: "For hospitals" },
  { href: "#faq", label: "FAQ" },
];

export function Nav() {
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-4">
        <nav
          className={`mx-auto flex h-16 max-w-[1240px] items-center justify-between rounded-full pl-4 pr-2 transition-all duration-500 ease-out-expo sm:pl-5 ${
            scrolled ? "bg-white/80 shadow-[0_10px_40px_-16px_rgba(10,22,48,.25)] ring-1 ring-line backdrop-blur-xl" : "bg-transparent"
          }`}
          aria-label="Main"
        >
          <Logo />
          <ul className="hidden items-center gap-1 lg:flex">
            {LINKS.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="rounded-full px-3.5 py-2 text-[14.5px] font-medium text-ink-2 transition hover:bg-mist hover:text-blue">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-1.5">
            {/* Wrapped so `hidden` isn't overridden by the button's own display class */}
            <div className="hidden items-center gap-1.5 sm:flex">
              {user ? (
                <ButtonLink href="/dashboard" size="md" arrow>
                  My dashboard
                </ButtonLink>
              ) : (
                <>
                  <Link href="/login" className="rounded-full px-4 py-2.5 text-[14.5px] font-semibold text-ink hover:text-blue">
                    Log in
                  </Link>
                  <ButtonLink href="/hospitals" size="md" arrow>
                    Book appointment
                  </ButtonLink>
                </>
              )}
            </div>
            <button onClick={() => setOpen(true)} className="grid size-11 place-items-center rounded-full text-ink hover:bg-mist lg:hidden" aria-label="Open menu">
              <Menu className="size-5" />
            </button>
          </div>
        </nav>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[60] flex flex-col bg-white px-5 pb-8 pt-5 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="flex items-center justify-between">
              <Logo />
              <button onClick={() => setOpen(false)} className="grid size-11 place-items-center rounded-full bg-mist" aria-label="Close menu">
                <X className="size-5" />
              </button>
            </div>
            <ul className="mt-10 space-y-1">
              {LINKS.map((l, i) => (
                <motion.li key={l.href} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i + 0.05 }}>
                  <a href={l.href} onClick={() => setOpen(false)} className="block py-3 font-display text-[34px] font-bold tracking-[-0.04em] text-ink">
                    {l.label}
                  </a>
                </motion.li>
              ))}
            </ul>
            <div className="mt-auto grid gap-3">
              <ButtonLink href="/hospitals" size="lg" arrow>
                Book appointment
              </ButtonLink>
              <ButtonLink href={user ? "/dashboard" : "/login"} size="lg" variant="secondary">
                {user ? "My dashboard" : "Log in"}
              </ButtonLink>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
