"use client";

import { useState } from "react";
import { BadgeCheck, MapPin, Phone } from "lucide-react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import type { HospitalApplication } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ErrorNote, inputClass } from "@/components/ui/Field";
import { Empty, Panel, Segmented } from "./bits";

const REJECT_REASONS = ["Registration number could not be verified", "Location doesn't match the address", "Duplicate of a listed hospital", "Not a hospital or clinic"];

function ApplicationCard({ a, onDone }: { a: HospitalApplication; onDone: () => void }) {
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [approved, setApproved] = useState<{ slug: string; deskLogin: string } | null>(null);

  const approve = async () => {
    if (!window.confirm(`Approve ${a.hospitalName}? It goes live for patients straight away.`)) return;
    setBusy("approve");
    setError(null);
    try {
      const r = await api<{ hospital: { slug: string }; deskLogin: string }>(`/admin/applications/${a.id}/approve`, { method: "POST" });
      setApproved({ slug: r.hospital.slug, deskLogin: r.deskLogin });
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const reject = async (reason: string) => {
    setBusy("reject");
    setError(null);
    try {
      await api(`/admin/applications/${a.id}/reject`, { method: "POST", body: { note: reason } });
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <li className="rounded-[20px] bg-[#fafbfe] p-5 ring-1 ring-line">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-display text-[19px] font-bold tracking-[-0.02em]">{a.hospitalName}</p>
            <Badge tone={a.status === "PENDING" ? "amber" : a.status === "APPROVED" ? "green" : "red"} dot>
              {a.status === "PENDING" ? "Waiting for review" : a.status === "APPROVED" ? "Approved" : "Rejected"}
            </Badge>
          </div>
          <p className="mt-0.5 text-[13.5px] text-muted">
            {a.address}, {a.city}, {a.state} {a.pincode} · applied {new Date(a.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
          </p>
        </div>
        <a href={`https://www.google.com/maps?q=${a.lat},${a.lng}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-blue hover:underline">
          <MapPin className="size-4" /> Check map pin
        </a>
      </div>
      <p className="mt-3 text-[14.5px] text-ink-2">{a.description}</p>
      <dl className="mt-4 grid gap-x-6 gap-y-2 text-[13.5px] sm:grid-cols-2">
        <div>
          <dt className="text-muted">State registration</dt>
          <dd className="font-mono">{a.registrationNo}</dd>
        </div>
        <div>
          <dt className="text-muted">ABDM HFR ID</dt>
          <dd className="font-mono">{a.hfrId ?? "Not given"}</dd>
        </div>
        <div>
          <dt className="text-muted">Desk contact</dt>
          <dd>
            {a.contactName} · {a.contactEmail}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Mobile / hospital phone</dt>
          <dd className="flex flex-wrap items-center gap-2">
            <a href={`tel:${a.contactPhone}`} className="inline-flex items-center gap-1 font-semibold text-blue">
              <Phone className="size-3.5" /> {a.contactPhone}
            </a>
            <span className="text-muted">/ {a.phone}</span>
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-muted">Specialities</dt>
          <dd className="mt-1 flex flex-wrap gap-1.5">
            {a.specialties.map((s) => (
              <span key={s} className="rounded-full bg-mist px-2.5 py-0.5 text-[12px] font-medium">
                {s}
              </span>
            ))}
            {a.emergency24x7 && <span className="rounded-full bg-rose/8 px-2.5 py-0.5 text-[12px] font-medium text-rose">24×7 emergency</span>}
            {a.beds ? <span className="rounded-full bg-mist px-2.5 py-0.5 text-[12px] font-medium">{a.beds} beds</span> : null}
          </dd>
        </div>
      </dl>
      {a.reviewNote && <p className="mt-3 rounded-xl bg-rose/6 px-3 py-2 text-[13px] text-rose">Reason: {a.reviewNote}</p>}
      {approved && (
        <p className="mt-3 flex items-center gap-2 rounded-xl bg-signal/10 px-3 py-2 text-[13.5px] text-signal">
          <BadgeCheck className="size-4" /> Live at /hospitals/{approved.slug}. The desk logs in with {approved.deskLogin}.
        </p>
      )}
      {error && (
        <div className="mt-3">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}
      {a.status === "PENDING" && !approved && (
        <div className="mt-4 border-t border-line pt-4">
          {!rejecting ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="success" onClick={approve} loading={busy === "approve"}>
                Approve and go live
              </Button>
              <Button variant="danger" onClick={() => setRejecting(true)}>
                Reject
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-[13.5px] font-semibold text-ink-2">Why? Tap one or write your own:</p>
              <div className="flex flex-wrap gap-2">
                {REJECT_REASONS.map((r) => (
                  <Button key={r} size="sm" variant="danger" onClick={() => reject(r)} loading={busy === "reject"}>
                    {r}
                  </Button>
                ))}
              </div>
              <div className="flex gap-2">
                <input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Other reason" />
                <Button variant="danger" onClick={() => reject(note)} disabled={note.trim().length < 3} loading={busy === "reject"}>
                  Reject
                </Button>
                <Button variant="ghost" onClick={() => setRejecting(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

export function Applications({ onChange }: { onChange: () => void }) {
  const [status, setStatus] = useState<"PENDING" | "APPROVED" | "REJECTED">("PENDING");
  const req = useApi<{ applications: HospitalApplication[] }>("/admin/applications", { status });
  const rows = req.data?.applications ?? null;
  return (
    <Panel
      title="Hospital applications"
      action={
        <Segmented
          value={status}
          onChange={setStatus}
          options={[
            { value: "PENDING", label: "Waiting" },
            { value: "APPROVED", label: "Approved" },
            { value: "REJECTED", label: "Rejected" },
          ]}
        />
      }
    >
      <p className="-mt-2 mb-4 text-[13.5px] text-muted">Check the registration number with the state register and that the map pin sits on the hospital before approving.</p>
      {rows === null ? (
        <div className="h-40 animate-pulse rounded-2xl bg-mist" />
      ) : rows.length === 0 ? (
        <Empty title="Nothing here" body={status === "PENDING" ? "New applications from /list-your-hospital appear here." : "No applications in this list yet."} />
      ) : (
        <ul className="space-y-3">
          {rows.map((a) => (
            <ApplicationCard
              key={a.id}
              a={a}
              onDone={() => {
                onChange();
                setTimeout(req.reload, 2500);
              }}
            />
          ))}
        </ul>
      )}
    </Panel>
  );
}
