"use client";
import { useMemo, useState } from "react";
import { writeTag } from "@/lib/writeTag";

export function Analog({
  value, spValue, unit, min = 0, max = 100,
  ll, l, h, hh,
  colors = { ll: "#ef4444", l: "#f59e0b", normal: "#16a34a", h: "#f59e0b", hh: "#ef4444" },
  title,
  spTagId, // si viene → permitimos escritura de setpoint
}: {
  value?: number;
  spValue?: number;
  unit?: string;
  min?: number; max?: number;
  ll?: number; l?: number; h?: number; hh?: number;
  colors?: { ll?: string; l?: string; normal?: string; h?: string; hh?: string };
  title?: string;
  spTagId?: number;
}) {
  const v = Number.isFinite(Number(value)) ? Number(value) : undefined;

  const band = useMemo(() => {
    if (v == null) return "normal";
    if (hh != null && v >= hh) return "hh";
    if (h  != null && v >= h ) return "h";
    if (ll != null && v <= ll) return "ll";
    if (l  != null && v <= l ) return "l";
    return "normal";
  }, [v, ll, l, h, hh]);

  const color =
    band === "hh" ? colors.hh :
    band === "h"  ? colors.h  :
    band === "ll" ? colors.ll :
    band === "l"  ? colors.l  :
                    colors.normal;

  const pct = v == null ? 0 : Math.max(0, Math.min(1, (v - min) / (max - min || 1)));

  const [spDraft, setSpDraft] = useState<number | ''>(spValue ?? '');

  const writeSp = async () => {
    if (!spTagId) return;
    const num = Number(spDraft);
    if (!Number.isFinite(num)) return;
    await writeTag(spTagId, num);
  };

  return (
    <div className="flex h-full w-full flex-col p-2" style={{ borderColor: color, borderWidth: 2, borderRadius: 12 }}>
      {title && <div className="mb-1 text-sm">{title}</div>}

      {/* barra horizontal simple */}
      <div className="relative h-3 w-full bg-gray-200 rounded">
        <div className="absolute left-0 top-0 h-3 rounded" style={{ width: `${pct*100}%`, background: color }} />
      </div>

      <div className="mt-2 flex items-baseline gap-2">
        <div className="text-2xl font-semibold">
          {v != null ? v.toFixed(1) : "--"}
        </div>
        <div className="text-sm text-gray-600">{unit ?? ""}</div>
        <div className="ml-auto text-xs text-gray-500">{min} .. {max}</div>
      </div>

      {(ll!=null || l!=null || h!=null || hh!=null) && (
        <div className="mt-1 text-xs text-gray-600 flex gap-3">
          {ll!=null && <span>LL:{ll}</span>}
          {l !=null && <span>L:{l}</span>}
          {h !=null && <span>H:{h}</span>}
          {hh!=null && <span>HH:{hh}</span>}
        </div>
      )}

      {spTagId && (
        <div className="mt-2 flex items-center gap-2">
          <input
            type="number"
            className="input w-28"
            value={spDraft}
            onChange={e => setSpDraft(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="SP"
          />
          <button className="btn btn-sm" onClick={writeSp} disabled={spDraft === ''}>Set SP</button>
          <div className="text-xs text-gray-500">Actual SP: {spValue ?? '--'}</div>
        </div>
      )}
    </div>
  );
}
