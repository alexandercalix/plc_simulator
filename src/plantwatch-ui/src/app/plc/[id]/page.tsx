"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";


import { usePlc } from "@/hooks/usePlcs";
import { usePlcSocket } from "@/hooks/usePlcSocket";
import { patchPlc } from "@/lib/api";

import StatusPill from "@/components/StatusPill";
import Tabs from "@/components/Tabs";
import TagMonitorTable from "@/components/TagMonitorTable";
import TagConfigGrid from "@/components/TagConfigGrid";

export default function PlcDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { plc, isLoading, mutate } = usePlc(id);

  // Live updates: only mutate when events belong to this PLC
  usePlcSocket({
    onPlcStatus: (e) => { if (e.plcId === id) mutate(); },
    onTagUpdate:  (e) => { if (e.plcId === id) mutate(); },
  });

  async function toggleEnabled() {
    if (!plc) return;
    try {
      await patchPlc(plc.id, { enabled: !plc.enabled });
      mutate();
    } catch (e: any) {
      toast.error(e?.message || "Update failed");
    }
  }

  if (isLoading || !plc) return <div className="p-6">Loading…</div>;

  return (
    <main className="space-y-6 p-6 mb-5">
      {/* Header / summary */}
      <section className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">{plc.name}</h2>
          <StatusPill status={plc.status} />
        </div>

        <div className="text-sm text-gray-600">
          {plc.ip}:{plc.port} — Rack {plc.rack}, Slot {plc.slot} — {plc.type}
        </div>

        <div className="flex items-center gap-2">
          <button className="btn" onClick={toggleEnabled}>
            {plc.enabled ? "Disable" : "Enable"}
          </button>
        </div>

        {plc.lastError && (
          <div className="text-sm text-red-700">
            Last error: {plc.lastError} {plc.lastErrorAt ? `(${plc.lastErrorAt})` : ""}
          </div>
        )}
      </section>

      {/* Monitor / Configure */}
      <section className="card p-0 h-[650px] overflow-hidden">
  <div className="flex h-full min-h-0 flex-col">
    <Tabs
      tabs={[
        {
          label: "Monitor",
          // panel gets its own scroller
          content: (
            <div className="h-full min-h-0 overflow-auto px-4 py-3">
              <TagMonitorTable tags={plc.tags ?? []} />
            </div>
          ),
        },
        {
          label: "Configure",
          // let the grid fill available height; it will handle its own scroll
          content: (
            <div className="h-full min-h-0">
              <TagConfigGrid
                plcId={plc.id}
                initialTags={plc.tags ?? []}
                onSaved={mutate}
              />
            </div>
          ),
        },
      ]}
    />
  </div>
</section>

    </main>
  );
}
