"use client";

import { useState } from "react";
import { Plus, Trash2, UserRound } from "lucide-react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import type { Gender, Profile } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { ErrorNote, Field, inputClass } from "@/components/ui/Field";

const RELATIONS = ["Mother", "Father", "Spouse", "Son", "Daughter", "Grandparent", "Other"];
const GENDERS: { value: Gender; label: string }[] = [
  { value: "FEMALE", label: "Female" },
  { value: "MALE", label: "Male" },
  { value: "OTHER", label: "Other" },
];

export function useProfiles(enabled = true) {
  const req = useApi<{ profiles: Profile[]; max: number }>(enabled ? "/profiles" : null);
  return { profiles: req.data?.profiles ?? null, max: req.data?.max ?? 6, reload: req.reload, error: req.error };
}

/** Add a family member with buttons for relation and gender; only name is typed. */
export function AddFamilyForm({ onAdded, onCancel }: { onAdded: (p: Profile) => void; onCancel?: () => void }) {
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [relation, setRelation] = useState("Mother");
  const [gender, setGender] = useState<Gender | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ profile: Profile }>("/profiles", { method: "POST", body: { name, age: age ? Number(age) : null, relation, gender } });
      onAdded(r.profile);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 rounded-2xl bg-mist p-4">
      <div className="flex flex-wrap gap-1.5">
        {RELATIONS.map((r) => (
          <button key={r} type="button" onClick={() => setRelation(r)} className={`h-9 rounded-full px-3.5 text-[13px] font-semibold ${relation === r ? "bg-blue text-white" : "bg-white text-ink-2 ring-1 ring-line"}`}>
            {r}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-[1fr_88px] gap-2">
        <Field label="Name">
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
        </Field>
        <Field label="Age">
          <input className={inputClass} inputMode="numeric" value={age} onChange={(e) => setAge(e.target.value.replace(/\D/g, "").slice(0, 3))} />
        </Field>
      </div>
      <div className="flex gap-1.5">
        {GENDERS.map((g) => (
          <button key={g.value} type="button" onClick={() => setGender(g.value)} className={`h-9 rounded-full px-3.5 text-[13px] font-semibold ${gender === g.value ? "bg-ink text-white" : "bg-white text-ink-2 ring-1 ring-line"}`}>
            {g.label}
          </button>
        ))}
      </div>
      {error && <ErrorNote>{error}</ErrorNote>}
      <div className="flex gap-2">
        <Button type="button" onClick={save} loading={busy} disabled={name.trim().length < 2}>
          Add {relation.toLowerCase()}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}

/** The profile used when the patient hasn't picked one: themselves. */
export const defaultProfileId = (profiles: Profile[] | null) => profiles?.find((p) => p.relation === "Self")?.id ?? profiles?.[0]?.id ?? null;

/** "Who is this for?" Each family member is a big button. */
export function ProfilePicker({
  profiles,
  max,
  reload,
  value,
  onChange,
}: {
  profiles: Profile[] | null;
  max: number;
  reload: () => void;
  value: string | null;
  onChange: (id: string) => void;
}) {
  const [adding, setAdding] = useState(false);

  if (!profiles) return <div className="h-12 animate-pulse rounded-xl bg-mist" />;
  const selected = value ?? defaultProfileId(profiles);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {profiles.map((p) => {
          const on = p.id === selected;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onChange(p.id)}
              aria-pressed={on}
              className={`flex items-center gap-2 rounded-2xl py-2 pl-2 pr-4 text-left transition ${on ? "bg-blue text-white" : "bg-white text-ink ring-1 ring-line hover:ring-blue/40"}`}
            >
              <span className={`grid size-8 place-items-center rounded-xl ${on ? "bg-white/15" : "bg-sky text-blue"}`}>
                <UserRound className="size-4" />
              </span>
              <span>
                <span className="block text-[14px] font-semibold leading-tight">{p.relation === "Self" ? "Me" : p.name.split(" ")[0]}</span>
                <span className={`block text-[11.5px] leading-tight ${on ? "text-white/75" : "text-muted"}`}>
                  {p.relation === "Self" ? p.name.split(" ")[0] : p.relation}
                  {p.age !== null ? ` · ${p.age}` : ""}
                </span>
              </span>
            </button>
          );
        })}
        {profiles.length < max && !adding && (
          <button type="button" onClick={() => setAdding(true)} className="flex items-center gap-2 rounded-2xl px-4 py-2 text-[14px] font-semibold text-blue ring-1 ring-dashed ring-blue/40 hover:bg-sky">
            <Plus className="size-4" /> Family member
          </button>
        )}
      </div>
      {adding && (
        <AddFamilyForm
          onAdded={(p) => {
            setAdding(false);
            reload();
            onChange(p.id);
          }}
          onCancel={() => setAdding(false)}
        />
      )}
    </div>
  );
}

/** Dashboard panel: list, add and remove family members. */
export function FamilyPanel() {
  const { profiles, max, reload } = useProfiles();
  const [adding, setAdding] = useState(false);
  const remove = async (p: Profile) => {
    if (!window.confirm(`Remove ${p.name}? Their past bookings stay in your history.`)) return;
    await api(`/profiles/${p.id}`, { method: "DELETE" }).catch(() => {});
    reload();
  };
  return (
    <div>
      <ul className="divide-y divide-line">
        {(profiles ?? []).map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-3 py-3">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-2xl bg-sky text-blue">
                <UserRound className="size-5" />
              </span>
              <div>
                <p className="text-[15px] font-semibold">{p.name}</p>
                <p className="text-[13px] text-muted">
                  {p.relation === "Self" ? "You" : p.relation}
                  {p.age !== null ? ` · ${p.age} yrs` : ""}
                </p>
              </div>
            </div>
            {p.relation !== "Self" && (
              <button onClick={() => remove(p)} className="grid size-9 place-items-center rounded-full text-muted hover:bg-rose/8 hover:text-rose" aria-label={`Remove ${p.name}`}>
                <Trash2 className="size-4" />
              </button>
            )}
          </li>
        ))}
      </ul>
      {adding ? (
        <div className="mt-3">
          <AddFamilyForm
            onAdded={() => {
              setAdding(false);
              reload();
            }}
            onCancel={() => setAdding(false)}
          />
        </div>
      ) : (
        profiles &&
        profiles.length < max && (
          <Button variant="secondary" size="sm" className="mt-3" onClick={() => setAdding(true)}>
            <Plus className="size-4" /> Add family member
          </Button>
        )
      )}
      <p className="mt-3 text-[12.5px] text-muted">Up to {max} people. Each person gets their own token at the hospital.</p>
    </div>
  );
}
