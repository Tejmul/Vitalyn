"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { ErrorNote, Field, inputClass } from "@/components/ui/Field";

const DEMO = [
  { label: "Patient", email: "user@vitalyn.in", password: "User@1234" },
  { label: "Hospital desk", email: "hospital@vitalyn.in", password: "Hospital@1234" },
  { label: "Doctor", email: "doctor@vitalyn.in", password: "Doctor@1234" },
  { label: "Admin", email: "admin@vitalyn.in", password: "Admin@1234" },
];

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const next = useSearchParams().get("next");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const go = async (e = email, p = password) => {
    setBusy(true);
    setError(null);
    try {
      await login(e, p);
      router.push(next?.startsWith("/") ? next : "/dashboard");
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <>
      <h1 className="font-display text-[40px] font-extrabold leading-none tracking-[-0.05em]">Welcome back</h1>
      <p className="mt-2 text-[15.5px] text-muted">Log in to book and track your appointments.</p>
      <form
        className="mt-8 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          go();
        }}
      >
        <Field label="Email">
          <input className={inputClass} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </Field>
        <Field label="Password">
          <input className={inputClass} type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        {error && <ErrorNote>{error}</ErrorNote>}
        <Button type="submit" size="lg" className="w-full" arrow loading={busy}>
          Log in
        </Button>
      </form>
      <p className="mt-6 text-center text-[14.5px] text-muted">
        New here?{" "}
        <Link href={`/register${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-blue hover:underline">
          Create a free account
        </Link>
      </p>

      {process.env.NODE_ENV !== "production" && (
        <div className="mt-10 rounded-2xl bg-mist p-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">Demo accounts · one tap</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {DEMO.map((d) => (
              <button key={d.label} onClick={() => go(d.email, d.password)} disabled={busy} className="h-10 rounded-full bg-white text-[13.5px] font-semibold text-ink ring-1 ring-line hover:text-blue hover:ring-blue/40">
                {d.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
