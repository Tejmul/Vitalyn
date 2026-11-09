"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, MessageSquareText } from "lucide-react";
import { safeNext } from "@/lib/safeNext";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { ErrorNote, Field, inputClass } from "@/components/ui/Field";

const DEMO = [
  { label: "Patient", phone: "9800000001" },
  { label: "Hospital desk", phone: "9800000002" },
  { label: "Reception", phone: "9800000005" },
  { label: "Doctor", phone: "9800000003" },
  { label: "Admin", phone: "9800000004" },
];

type Step = "phone" | "code" | "profile";

const digits = (v: string) => v.replace(/\D/g, "");
const pretty = (p: string) => `+91 ${p.slice(0, 5)} ${p.slice(5)}`;

/** Mobile number → 6-digit code → (new numbers) name and consent. The only way to log in. */
export function PhoneLogin({ mode }: { mode: "login" | "register" }) {
  const { requestOtp, verifyOtp, completeProfile } = useAuth();
  const router = useRouter();
  const next = useSearchParams().get("next");
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  // Seconds until "Send a new code" is allowed again
  const [wait, setWait] = useState(0);
  const [signupToken, setSignupToken] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [adult, setAdult] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step !== "code") return;
    const id = setInterval(() => setWait((w) => (w > 0 ? w - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [step]);

  const goNext = () => router.push(safeNext(next));

  const send = async (p = phone) => {
    setBusy("send");
    setError(null);
    try {
      const r = await requestOtp(p);
      setDevCode(r.devCode ?? null);
      setWait(r.resendIn);
      setCode("");
      setStep("code");
      setTimeout(() => codeRef.current?.focus(), 50);
      return r;
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setBusy(null);
    }
  };

  const verify = async (p = phone, c = code) => {
    setBusy("verify");
    setError(null);
    try {
      const r = await verifyOtp(p, c);
      if ("needsProfile" in r) {
        setSignupToken(r.signupToken);
        setStep("profile");
      } else goNext();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const finish = async () => {
    if (!signupToken) return;
    setBusy("profile");
    setError(null);
    try {
      await completeProfile({ signupToken, name, email: email || undefined, consent, adult });
      goNext();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const demo = async (p: string) => {
    setPhone(p);
    const r = await send(p);
    if (r?.devCode) await verify(p, r.devCode);
  };

  return (
    <>
      {step === "phone" && (
        <>
          <h1 className="font-display text-[40px] font-extrabold leading-none tracking-[-0.05em]">{mode === "login" ? "Log in" : "Create your account"}</h1>
          <p className="mt-2 text-[15.5px] text-muted">Enter your mobile number. We&apos;ll text you a 6-digit code. No password needed.</p>
          <form
            className="mt-8 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <Field label="Mobile number">
              <div className="flex items-center rounded-xl bg-white ring-1 ring-line focus-within:ring-2 focus-within:ring-blue">
                <span className="border-r border-line px-4 font-mono text-[15.5px] text-ink-2">+91</span>
                <input
                  className="h-12 w-full rounded-xl bg-transparent px-4 font-mono text-[17px] tracking-wider outline-none"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  value={phone}
                  onChange={(e) => setPhone(digits(e.target.value).replace(/^91(?=\d{10})/, "").slice(0, 10))}
                  placeholder="98765 43210"
                  autoFocus
                />
              </div>
            </Field>
            {error && <ErrorNote>{error}</ErrorNote>}
            <Button type="submit" size="lg" className="w-full" arrow loading={busy === "send"} disabled={phone.length !== 10}>
              Send code
            </Button>
          </form>
          <p className="mt-6 text-center text-[13.5px] text-muted">
            New to Vitalyn? Just enter your number. Hospitals can{" "}
            <Link href="/list-your-hospital" className="font-semibold text-blue hover:underline">
              apply to join
            </Link>
            .
          </p>
        </>
      )}

      {step === "code" && (
        <>
          <button onClick={() => setStep("phone")} className="mb-6 inline-flex items-center gap-2 text-[14px] font-semibold text-muted hover:text-blue">
            <ArrowLeft className="size-4" /> Change number
          </button>
          <h1 className="font-display text-[36px] font-extrabold leading-none tracking-[-0.05em]">Enter the code</h1>
          <p className="mt-2 text-[15.5px] text-muted">
            Sent to <b className="font-mono text-ink">{pretty(phone)}</b>. It works for 10 minutes.
          </p>
          {devCode && (
            <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl bg-amber/10 px-4 py-3 text-[13.5px] text-amber ring-1 ring-amber/20">
              <span className="flex items-center gap-2">
                <MessageSquareText className="size-4" /> Development mode, no SMS sent. Code: <b className="font-mono tracking-widest">{devCode}</b>
              </span>
              <button type="button" onClick={() => setCode(devCode)} className="font-semibold underline">
                Fill in
              </button>
            </div>
          )}
          <form
            className="mt-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              verify();
            }}
          >
            <input
              ref={codeRef}
              className={`${inputClass} h-16 text-center font-mono text-[30px] tracking-[0.5em]`}
              inputMode="numeric"
              autoComplete="one-time-code"
              aria-label="6-digit code"
              value={code}
              onChange={(e) => setCode(digits(e.target.value).slice(0, 6))}
              placeholder="••••••"
            />
            {error && <ErrorNote>{error}</ErrorNote>}
            <Button type="submit" size="lg" className="w-full" arrow loading={busy === "verify"} disabled={code.length !== 6}>
              Verify and continue
            </Button>
          </form>
          <div className="mt-5 text-center text-[14px]">
            {wait > 0 ? (
              <span className="text-muted">Send a new code in {wait}s</span>
            ) : (
              <button onClick={() => send()} disabled={busy === "send"} className="font-semibold text-blue hover:underline">
                Send a new code
              </button>
            )}
          </div>
        </>
      )}

      {step === "profile" && (
        <>
          <h1 className="font-display text-[36px] font-extrabold leading-none tracking-[-0.05em]">Welcome to Vitalyn</h1>
          <p className="mt-2 text-[15.5px] text-muted">
            <b className="font-mono text-ink">{pretty(phone)}</b> is verified. Tell us your name to finish.
          </p>
          <form
            className="mt-8 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              finish();
            }}
          >
            <Field label="Full name">
              <input className={inputClass} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Riya Patel" autoFocus />
            </Field>
            <Field label="Email" hint="Optional">
              <input className={inputClass} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
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
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-mist p-4 text-[14px] text-ink-2">
              <input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-[var(--blue)]" />
              <span>I am 18 or older. (Children are booked for by a parent, from the parent&apos;s account.)</span>
            </label>
            {error && <ErrorNote>{error}</ErrorNote>}
            <Button type="submit" size="lg" className="w-full" arrow loading={busy === "profile"} disabled={name.trim().length < 2 || !consent || !adult}>
              Create account
            </Button>
          </form>
        </>
      )}

      {process.env.NODE_ENV !== "production" && step === "phone" && (
        <div className="mt-10 rounded-2xl bg-mist p-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">Demo accounts · one tap</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {DEMO.map((d) => (
              <button key={d.label} onClick={() => demo(d.phone)} disabled={busy !== null} className="h-10 rounded-full bg-white text-[13.5px] font-semibold text-ink ring-1 ring-line hover:text-blue hover:ring-blue/40">
                {d.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
