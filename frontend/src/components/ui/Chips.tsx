"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

/** Multi-select as big toggle buttons, with an optional "add your own". */
export function ChipSelect({
  options,
  value,
  onChange,
  allowCustom = false,
  single = false,
}: {
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
  allowCustom?: boolean;
  single?: boolean;
}) {
  const [custom, setCustom] = useState("");
  const all = [...options, ...value.filter((v) => !options.includes(v))];
  const toggle = (o: string) => {
    if (single) return onChange([o]);
    onChange(value.includes(o) ? value.filter((v) => v !== o) : [...value, o]);
  };
  const add = () => {
    const v = custom.trim();
    if (v.length >= 2 && !value.includes(v)) onChange(single ? [v] : [...value, v]);
    setCustom("");
  };
  return (
    <div className="flex flex-wrap gap-1.5">
      {all.map((o) => {
        const on = value.includes(o);
        return (
          <button key={o} type="button" onClick={() => toggle(o)} aria-pressed={on} className={`h-9 rounded-full px-3.5 text-[13px] font-semibold transition ${on ? "bg-blue text-white" : "bg-white text-ink-2 ring-1 ring-line hover:ring-blue/40"}`}>
            {o}
          </button>
        );
      })}
      {allowCustom && (
        <span className="inline-flex h-9 items-center rounded-full bg-white pl-3 ring-1 ring-dashed ring-line">
          <input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
            placeholder="Other…"
            className="w-24 bg-transparent text-[13px] outline-none"
            aria-label="Add another"
          />
          <button type="button" onClick={add} className="grid size-9 place-items-center rounded-full text-blue" aria-label="Add">
            <Plus className="size-4" />
          </button>
        </span>
      )}
    </div>
  );
}
