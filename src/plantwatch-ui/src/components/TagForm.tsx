"use client";
import { useState } from "react";
import type { Tag } from "@/types";
import { toNumber } from "@/lib/forms";

const EMPTY: Partial<Tag> = { area: "DB", dbNumber: 1, start: 0, amount: 1, dataType: "INT", polling: true, readOnly: false };

export default function TagForm({
  onSubmit, initial, submitLabel = "Save Tag", plcId,
}: {
  onSubmit: (p: Partial<Tag>) => Promise<void> | void;
  initial?: Partial<Tag>;
  submitLabel?: string;
  plcId: number;
}) {
  const [form, setForm] = useState<Partial<Tag>>({ ...(initial ?? EMPTY), plcId });
  const set = <K extends keyof Tag>(k: K, v: Tag[K] | any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <form className="grid grid-cols-3 gap-3" onSubmit={async e=>{ e.preventDefault(); await onSubmit(form); }}>
      <label className="label col-span-2">Name<input className="input mt-1" value={form.name ?? ""} onChange={e=>set("name", e.target.value)} /></label>
      <label className="label">Area
        <select className="input mt-1" value={form.area as any} onChange={e=>set("area", e.target.value)}>
          {["DB","PE","PA","MK","TM","CT"].map(a=> <option key={a}>{a}</option>)}
        </select>
      </label>
      <label className="label">DB<input className="input mt-1" type="number" value={form.dbNumber ?? 1} onChange={e=>set("dbNumber", toNumber(e.target.value))} /></label>
      <label className="label">Start<input className="input mt-1" type="number" value={form.start ?? 0} onChange={e=>set("start", toNumber(e.target.value))} /></label>
      <label className="label">Amount<input className="input mt-1" type="number" value={form.amount ?? 1} onChange={e=>set("amount", toNumber(e.target.value))} /></label>
      <label className="label">Type
        <select className="input mt-1" value={form.dataType as any} onChange={e=>set("dataType", e.target.value)}>
          {["BOOL","BYTE","WORD","INT","DWORD","DINT","REAL"].map(t=> <option key={t}>{t}</option>)}
        </select>
      </label>
      <label className="label col-span-3 flex items-center gap-4">
        <span className="flex items-center gap-1"><input type="checkbox" checked={!!form.polling} onChange={e=>set("polling", e.target.checked)} />Polling</span>
        <span className="flex items-center gap-1"><input type="checkbox" checked={!!form.readOnly} onChange={e=>set("readOnly", e.target.checked)} />Read only</span>
      </label>
      <button className="btn col-span-3" type="submit">{submitLabel}</button>
    </form>
  );
}
