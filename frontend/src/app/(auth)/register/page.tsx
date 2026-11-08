"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { ErrorNote, Field, inputClass } from "@/components/ui/Field";

function RegisterForm() {
  const { register } = useAuth();
  const router = useRouter();
  const next = useSearchParams().get("next");
  const [f, setF] = useState({ name: "", email: "", username: "", phone: "", password: "" });
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((x) => ({ ...x, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await register({ ...f, phone: f.phone || undefined, consent });
      router.push(next?.startsWith("/") ? next : "/dashboard");
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <>
      <h1 className="font-display text-[40px] font-extrabold leading-none tracking-[-0.05em]">Create your account</h1>
      <p className="mt-2 text-[15.5px] text-muted">Free for patients. Takes under a minute.</p>
      <form className="mt-8 space-y-4" onSubmit={submit}>
        <Field label="Full name">
          <input className={inputClass} autoComplete="name" required value={f.name} onChange={set("name")} placeholder="Riya Patel" />
        </Field>
        <Field label="Email">
          <input className={inputClass} type="email" autoComplete="email" required value={f.email} onChange={set("email")} placeholder="you@example.com" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Username">
            <input
              className={inputClass}
              autoComplete="username"
              required
              value={f.username}
              onChange={(e) => setF((x) => ({ ...x, username: e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, "") }))}
              placeholder="riya_p"
            />
          </Field>
          <Field label="Mobile" hint="Optional">
            <input className={inputClass} type="tel" inputMode="tel" autoComplete="tel" value={f.phone} onChange={set("phone")} placeholder="98765 43210" />
          </Field>
        </div>
        <Field label="Password" hint="8+ characters">
          <input className={inputClass} type="password" autoComplete="new-password" required minLength={8} value={f.password} onChange={set("password")} />
        </Field>
        <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-mist p-4 text-[14px] text-ink-2">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-[var(--blue)]" />
          <span>
            I agree that Vitalyn can use my details to book appointments and share each booking with the hospital I choose.{" "}
            <Link href="/privacy" target="_blank" className="font-semibold text-blue hover:underline">
              Read the privacy notice
            </Link>
          </span>
        </label>
        {error && <ErrorNote>{error}</ErrorNote>}
        <Button type="submit" size="lg" className="w-full" arrow loading={busy} disabled={!consent}>
          Create account
        </Button>
      </form>
      <p className="mt-6 text-center text-[14.5px] text-muted">
        Already have an account?{" "}
        <Link href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-blue hover:underline">
          Log in
        </Link>
      </p>
    </>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
