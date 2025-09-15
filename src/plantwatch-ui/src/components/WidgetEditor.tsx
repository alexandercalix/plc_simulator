// components/WidgetEditor.tsx
"use client";

import { useState } from "react";
import TagPicker from "@/components/TagPicker";
import { SourceTag, Widget } from "@/types";

export default function WidgetEditor({
  value,
  onChange,
  onSave,
  onCancel
}: {
  value: Widget;
  onChange: (w: Widget) => void;
  onSave: (w: Widget) => void;
  onCancel: () => void;
}) {
  // modal del picker + qué campo estamos editando
  const [open, setOpen] = useState(false);
  const [openField, setOpenField] = useState<string | null>(null);

  const setField = (patch: Partial<Widget>) => onChange({ ...value, ...patch });
  const setSource = (s: SourceTag) => onChange({ ...value, source: s });

  function TagBtn({
    label, current, onPick
  }: { label: string; current?: any; onPick: () => void }) {
    return (
      <div className="flex items-center gap-2">
        <button className="btn btn-sm" onClick={onPick}>{label}</button>
        <div className="text-xs text-gray-600">
          {current?.name ? `${current.name} (PLC ${current.plcId})` : "—"}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-lg font-semibold mb-2">Widget</div>

      <div className="flex gap-2">
        <select
          className="input"
          value={value.type}
          onChange={e => setField({ type: e.target.value as Widget["type"] })}
        >
          <option value="gauge">Gauge</option>
          <option value="tank">Tank</option>
          <option value="boolLamp">Boolean Lamp</option>
          <option value="imageToggle">Image Toggle</option>
          <option value="analog">Analog</option>
          <option value="pump">Pump</option>
        </select>

        {/* Caso genérico (widgets simples con un solo source) */}
        <button
          className="btn"
          onClick={() => { setOpenField("source"); setOpen(true); }}
        >
          { (value as any).source?.name ? `Tag: ${(value as any).source.name}` : "Pick Tag" }
        </button>
      </div>

      <input
        className="input w-full"
        placeholder="Title"
        value={value.title ?? ""}
        onChange={e => setField({ title: e.target.value })}
      />

      {/* min/max/unit para gauge/tank/analog; NO para bool/pump/image */}
      {(value.type === "gauge" || value.type === "tank" || value.type === "analog") && (
        <div className="flex gap-2">
          <input
            type="number"
            className="input w-24"
            placeholder="min"
            value={(value as any).min ?? 0}
            onChange={e => setField({ ...(value as any), min: +e.target.value })}
          />
          <input
            type="number"
            className="input w-24"
            placeholder="max"
            value={(value as any).max ?? 100}
            onChange={e => setField({ ...(value as any), max: +e.target.value })}
          />
          <input
            className="input w-28"
            placeholder="unit"
            value={(value as any).unit ?? ""}
            onChange={e => setField({ ...(value as any), unit: e.target.value })}
          />
        </div>
      )}

      {value.type === "imageToggle" && (
        <div className="flex gap-2">
          <input
            className="input flex-1"
            placeholder="On image URL"
            value={(value as any).onUrl ?? ""}
            onChange={e => setField({ ...(value as any), onUrl: e.target.value })}
          />
          <input
            className="input flex-1"
            placeholder="Off image URL"
            value={(value as any).offUrl ?? ""}
            onChange={e => setField({ ...(value as any), offUrl: e.target.value })}
          />
        </div>
      )}

      {/* ======= Analog (PV/SP + límites) ======= */}
      {value.type === "analog" && (
        <div className="space-y-2">
          <div className="flex gap-3 items-center">
            <TagBtn
              label="Pick PV"
              current={(value as any).pv}
              onPick={() => { setOpenField("pv"); setOpen(true); }}
            />
            <TagBtn
              label="Pick SP"
              current={(value as any).sp}
              onPick={() => { setOpenField("sp"); setOpen(true); }}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <input className="input w-20" type="number" placeholder="LL"
              value={(value as any).ll ?? ""}
              onChange={e => setField({ ...(value as any), ll: +e.target.value })}
            />
            <input className="input w-20" type="number" placeholder="L"
              value={(value as any).l ?? ""}
              onChange={e => setField({ ...(value as any), l: +e.target.value })}
            />
            <input className="input w-20" type="number" placeholder="H"
              value={(value as any).h ?? ""}
              onChange={e => setField({ ...(value as any), h: +e.target.value })}
            />
            <input className="input w-20" type="number" placeholder="HH"
              value={(value as any).hh ?? ""}
              onChange={e => setField({ ...(value as any), hh: +e.target.value })}
            />
          </div>
        </div>
      )}

      {/* ======= Pump (multi-tags) ======= */}
      {value.type === "pump" && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <TagBtn label="isRunning (FB)" current={(value as any).runFb} onPick={() => { setOpenField("runFb"); setOpen(true); }} />
            <TagBtn label="Run Command"    current={(value as any).runCmd} onPick={() => { setOpenField("runCmd"); setOpen(true); }} />
            <TagBtn label="Auto"           current={(value as any).auto}   onPick={() => { setOpenField("auto"); setOpen(true); }} />
            <TagBtn label="Hand"           current={(value as any).hand}   onPick={() => { setOpenField("hand"); setOpen(true); }} />
            <TagBtn label="VDD (Remote/Local)" current={(value as any).vdd} onPick={() => { setOpenField("vdd"); setOpen(true); }} />
            <TagBtn label="RTH"            current={(value as any).rth}    onPick={() => { setOpenField("rth"); setOpen(true); }} />
            <TagBtn label="RTM"            current={(value as any).rtm}    onPick={() => { setOpenField("rtm"); setOpen(true); }} />
          </div>

          <label className="flex items-center gap-2 mt-2">
            <input
              type="checkbox"
              checked={(value as any).allowCommands ?? false}
              onChange={e => setField({ ...(value as any), allowCommands: e.target.checked })}
            />
            <span className="text-sm">Allow Start/Stop Commands</span>
          </label>
        </div>
      )}

      <div className="flex gap-2 justify-end pt-2">
        <button className="btn" onClick={() => onSave(value)}>Save</button>
        <button className="btn" onClick={onCancel}>Cancel</button>
      </div>

      {/* ÚNICO TagPicker: asigna según openField */}
      <TagPicker
        open={open}
        onClose={() => { setOpen(false); setOpenField(null); }}
        onPick={(t) => {
          const tag: SourceTag = {
            plcId: t.plcId,
            tagId: t.tagId,
            name: t.name,
            unit: t.unit ?? undefined,
            dataType: t.dataType ?? undefined
          };

          if (!openField || openField === "source") {
            setSource(tag);
          } else {
            onChange({ ...value, [openField]: tag } as any);
          }

          setOpen(false);
          setOpenField(null);
        }}
      />
    </div>
  );
}
