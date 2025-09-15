"use client";
import { useState } from "react";
import type { Plc } from "@/types";
import { toNumber } from "@/lib/forms";

const EMPTY: Partial<Plc> = { name: "", ip: "", port: 102, rack: 0, slot: 1, type: "S7-1200", enabled: true };

export default function PlcForm({
  onSubmit, initial, submitLabel = "Save PLC",
}: {
  onSubmit: (p: Partial<Plc>) => Promise<void> | void;
  initial?: Partial<Plc>;
  submitLabel?: string;
}) {
  const [form, setForm] = useState<Partial<Plc>>(initial ?? EMPTY);
  const set = <K extends keyof Plc>(k: K, v: Plc[K] | any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <form
      className="grid grid-cols-2 gap-3"
      onSubmit={async (e) => { e.preventDefault(); await onSubmit(form); }}
    >
      <label className="label">Name<input className="input mt-1" value={form.name ?? ""} onChange={e=>set("name", e.target.value)} /></label>
      <label className="label">IP<input className="input mt-1" value={form.ip ?? ""} onChange={e=>set("ip", e.target.value)} /></label>
      <label className="label">Port<input className="input mt-1" type="number" value={form.port ?? 102} onChange={e=>set("port", toNumber(e.target.value))} /></label>
      <label className="label">Rack<input className="input mt-1" type="number" value={form.rack ?? 0} onChange={e=>set("rack", toNumber(e.target.value))} /></label>
      <label className="label">Slot<input className="input mt-1" type="number" value={form.slot ?? 1} onChange={e=>set("slot", toNumber(e.target.value))} /></label>
      <label className="label">Type
        <select className="input mt-1" value={form.type ?? "S7-1200"} onChange={e=>set("type", e.target.value)}>
          {["S7-1200","S7-1500","S7-300","S7-400"].map(t=> <option key={t}>{t}</option>)}
        </select>
      </label>
      <label className="label col-span-2 flex items-center gap-2 mt-2">
        <input type="checkbox" checked={!!form.enabled} onChange={e=>set("enabled", e.target.checked)} /> Enabled
      </label>
      <button className="btn col-span-2" type="submit">{submitLabel}</button>
    </form>
  );
}
