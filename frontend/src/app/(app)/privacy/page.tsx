import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy notice" };

const SECTIONS: [string, string[]][] = [
  ["What we collect", ["Your mobile number (you log in with it), your name, and your email if you add one.", "For each person you book for: name, age, gender and relation to you. ABHA number only if you add it.", "Each booking: hospital, doctor, date, time and the reason you type (optional)."]],
  ["Why we use it", ["To book appointments and send you updates about them.", "To show you hospitals near the place you choose. We don't store your GPS location."]],
  ["Who sees it", ["Only the hospital and doctor you book with see that booking.", "Vitalyn staff can see it to fix problems. Every change to a booking is logged."]],
  ["Your consent", ["We record when you agreed to this notice and which version, and when you withdraw by deleting your account. That record is kept as proof, without your name or number."]],
  ["Your choices", ["Download everything we hold about you from your dashboard, any time.", "Delete your account from your dashboard. Your profile and family members are erased; hospitals keep an anonymised record of past visits."]],
  ["Where it's kept", ["On servers in India."]],
  ["If something goes wrong", ["If your data is involved in a security breach, we report it to the Data Protection Board and CERT-In as the law requires, and tell you what happened and what to do."]],
  ["Questions or complaints", ["Write to privacy@vitalyn.in. We reply within 7 days."]],
];

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-[720px]">
      <p className="font-mono text-[11.5px] uppercase tracking-[0.14em] text-blue">Privacy notice · version 2026-11-v1</p>
      <h1 className="mt-2 font-display text-[clamp(2rem,4vw,2.8rem)] font-extrabold leading-none tracking-[-0.045em]">How Vitalyn uses your data</h1>
      <p className="mt-3 text-[16px] text-muted">Plain words, under India&apos;s Digital Personal Data Protection Act, 2023.</p>
      <div className="mt-8 space-y-6">
        {SECTIONS.map(([h, items]) => (
          <section key={h} className="rounded-[22px] bg-white p-6 ring-1 ring-line">
            <h2 className="font-display text-[19px] font-bold tracking-[-0.02em]">{h}</h2>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[15px] text-ink-2">
              {items.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </article>
  );
}
