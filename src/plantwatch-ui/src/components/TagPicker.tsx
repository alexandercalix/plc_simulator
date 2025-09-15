// components/TagPicker.tsx
"use client";

import { useState } from "react";
import useSWR from "swr";

type PickResult = {
  plcId: number;
  tagId: number;
  name: string;
  unit?: string | null;
  dataType?: string | null;
};

export default function TagPicker({
  open,
  onClose,
  onPick,
  plcId
}: {
  open: boolean;
  onClose: () => void;
  onPick: (t: PickResult) => void;
  plcId?: number; // optional prefilter
}) {
  const API = process.env.NEXT_PUBLIC_API || "http://localhost:3000";
  const [q, setQ] = useState("");

  // cuando el modal abre, llamamos; si cierra, no hay fetch
  const key = open ? ["tags", q, plcId] : null;
  const { data, error, isLoading } = useSWR(key, async ([, q, plcId]) => {
    // 1) PLC(s)
    let plcs: any[] = [];
    if (plcId) {
      const r = await fetch(`${API}/plcs/${plcId}`, { cache: "no-store" });
      if (!r.ok) return [];
      const one = await r.json();
      plcs = [one];
    } else {
      const r = await fetch(`${API}/plcs`, { cache: "no-store" });
      if (!r.ok) return [];
      plcs = await r.json();
    }

    // 2) aplanar tags
    let rows = plcs.flatMap((p: any) =>
      (p.tags ?? []).map((t: any) => ({
        id: t.id,
        name: t.name,
        plcId: p.id,
        plcName: p.name ?? `PLC ${p.id}`,
        dataType: t.dataType ?? null,
        unit: t.unit ?? null
      }))
    );

    // 3) filtro
    const qq = String(q || "").toLowerCase();
    if (qq) {
      rows = rows.filter(r =>
        (`${r.name} ${r.plcName}`).toLowerCase().includes(qq)
      );
    }

    // 4) orden
    rows.sort((a, b) =>
      a.plcName.localeCompare(b.plcName) || a.name.localeCompare(b.name)
    );

    return rows;
  });

  const rows: any[] = data ?? [];
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-4 w-[720px] max-h-[70vh] flex flex-col">
        <div className="flex gap-2 mb-3">
          <input
            autoFocus
            placeholder="Search tags or PLC…"
            className="input flex-1"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button className="btn" onClick={onClose}>Close</button>
        </div>

        <div className="border rounded-xl overflow-auto">
          {error && (
            <div className="p-3 text-sm text-red-600">
              Failed to load tags: {String(error)}
            </div>
          )}
          {isLoading && (
            <div className="p-3 text-sm text-gray-500">
              Loading…
            </div>
          )}

          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="p-2">Tag</th>
                <th className="p-2">PLC</th>
                <th className="p-2">Type</th>
                <th className="p-2">Unit</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any) => (
                <tr key={`${r.plcId}:${r.id}`} className="border-t">
                  <td className="p-2">{r.name}</td>
                  <td className="p-2">{r.plcName ?? r.plcId}</td>
                  <td className="p-2">{r.dataType ?? ""}</td>
                  <td className="p-2">{r.unit ?? ""}</td>
                  <td className="p-2 text-right">
                    <button
                      className="btn"
                      onClick={() => {
                        onPick({
                          plcId: r.plcId,
                          tagId: r.id,
                          name: r.name,
                          unit: r.unit,
                          dataType: r.dataType
                        });
                        onClose();
                      }}
                    >
                      Select
                    </button>
                  </td>
                </tr>
              ))}
              {!isLoading && rows.length === 0 && (
                <tr>
                  <td className="p-4 text-gray-500" colSpan={5}>
                    No results
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
