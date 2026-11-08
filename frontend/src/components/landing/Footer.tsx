import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

const COLS = [
  { h: "Patients", l: [["Find hospitals", "/hospitals"], ["Health camps", "/#events"], ["My bookings", "/dashboard"]] },
  { h: "Hospitals", l: [["List your hospital", "/list-your-hospital"], ["Hospital log in", "/login"], ["How approvals work", "/#how-it-works"]] },
  { h: "Company", l: [["About", "/#home"], ["FAQ", "/#faq"], ["Privacy", "/#faq"]] },
];

export function Footer() {
  return (
    <footer className="mx-auto max-w-[1240px] px-5 pb-10 pt-16">
      <div className="grid gap-10 md:grid-cols-12">
        <div className="md:col-span-5">
          <Logo />
          <p className="mt-4 max-w-[340px] text-[15px] text-muted">Hospital appointments for India. Find, book and get your OPD token without the queue.</p>
        </div>
        {COLS.map((c) => (
          <div key={c.h} className="md:col-span-2">
            <p className="font-mono text-[11.5px] uppercase tracking-[0.14em] text-muted">{c.h}</p>
            <ul className="mt-4 space-y-2.5">
              {c.l.map(([label, href]) => (
                <li key={label}>
                  <Link href={href} className="text-[15px] font-medium text-ink hover:text-blue">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mt-14 flex flex-col justify-between gap-3 border-t border-line pt-6 text-[13px] text-muted sm:flex-row">
        <p>© {new Date().getFullYear()} Vitalyn. Demo data: all hospitals and doctors shown are fictional.</p>
        <p>In an emergency, call 112.</p>
      </div>
    </footer>
  );
}
