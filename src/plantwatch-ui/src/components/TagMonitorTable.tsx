"use client";
import { useMemo, useRef, useState } from "react";
import type { Tag } from "@/types";
import { writeTag } from "@/lib/api";
import toast from "react-hot-toast";
import Modal from "@/components/Modal";

function safeParse(v: string | null) {
  if (v == null) return null;
  try { return JSON.parse(v); } catch { return v; }
}

// Heuristic slider ranges per dataType (adjust as needed)
function getRange(t: Tag): { min: number; max: number; step: number } {
  switch (t.dataType) {
    case "BYTE": return { min: 0, max: 255, step: 1 };
    case "WORD": return { min: 0, max: 65535, step: 1 };
    case "DWORD": return { min: 0, max: 1_000_000, step: 1 };
    case "INT": return { min: -32768, max: 32767, step: 1 };
    case "DINT": return { min: -100_000, max: 100_000, step: 1 };
    case "REAL": return { min: -1000, max: 1000, step: 0.1 };
    default: return { min: 0, max: 100, step: 1 };
  }
}

function isNumericType(t: Tag) {
  return ["BYTE", "WORD", "DWORD", "INT", "DINT", "REAL"].includes(t.dataType);
}

export default function TagMonitorTable({ tags }: { tags: Tag[] }) {
  const [busyId, setBusyId] = useState<number | null>(null);

  // Modal state for non-BOOL writes
  const [open, setOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [textValue, setTextValue] = useState<string>("");
  const [sliderValue, setSliderValue] = useState<number>(0);
  const lastSliderWriteRef = useRef<number>(0); // to throttle accidental double fires

  const tagsList = useMemo(() => tags ?? [], [tags]);

  function openWriteModal(t: Tag) {
    if (t.readOnly) return;
    setEditingTag(t);

    const parsed = safeParse(t.lastValue);
    if (Array.isArray(parsed) || t.amount > 1) {
      setTextValue(JSON.stringify(parsed ?? []));
    } else if (typeof parsed === "number" && isNumericType(t)) {
      setTextValue(String(parsed));
      setSliderValue(parsed);
    } else if (typeof parsed === "boolean") {
      setTextValue(String(parsed));
      setSliderValue(parsed ? 1 : 0);
    } else {
      setTextValue(parsed == null ? "" : String(parsed));
      const { min } = getRange(t);
      setSliderValue(min);
    }
    setOpen(true);
  }

  async function writeBool(t: Tag, next: boolean) {
    if (t.readOnly) return;
    try {
      setBusyId(t.id);
      await writeTag(t.id, next);
      toast.success(`Wrote ${next ? "TRUE" : "FALSE"} to ${t.name}`);
    } catch (e: any) {
      toast.error(e?.message || "Write failed");
    } finally {
      setBusyId(null);
    }
  }

  function coerceValueForTag(t: Tag, raw: string, slider: number) {
    // Arrays always via JSON
    if (t.amount > 1) {
      try { return JSON.parse(raw); }
      catch { throw new Error("For arrays, please enter valid JSON (e.g., [1,2,3])"); }
    }

    // BOOL should never reach here (handled inline), but keep safety:
    if (t.dataType === "BOOL") {
      if (raw.trim().toLowerCase() === "true") return true;
      if (raw.trim().toLowerCase() === "false") return false;
      if (raw.trim() === "1") return true;
      if (raw.trim() === "0") return false;
      throw new Error("Enter TRUE/FALSE or 1/0 for BOOL");
    }

    // Numeric types: parse text input as number
    if (isNumericType(t)) {
      const valStr = raw.trim();
      if (valStr.length > 0) {
        const n = Number(valStr);
        if (!Number.isFinite(n)) throw new Error("Enter a valid number");
        return t.dataType === "REAL" ? n : Math.trunc(n);
      }
      // If text is empty, use slider value
      return t.dataType === "REAL" ? slider : Math.trunc(slider);
    }

    // Fallback string payload
    return raw;
  }

  function scaleEngToRaw(engValue: number, tag: Tag): number {
    const { rawMin = 0, rawMax = 100, engMin = 0, engMax = 100 } = tag;

    // Skip if no meaningful scaling
    if (
      rawMin === 0 && rawMax === 100 && engMin === 0 && engMax === 100 &&
      !tag.rawMin && !tag.rawMax && !tag.engMin && !tag.engMax
    ) {
      return engValue;
    }

    // Avoid division by zero
    if (engMax === engMin) return rawMin;

    // Linear scaling: eng → raw
    let raw = rawMin + (engValue - engMin) * (rawMax - rawMin) / (engMax - engMin);

    // Clamp to raw range
    raw = Math.max(rawMin, Math.min(rawMax, raw));

    // Round if integer type
    if (["INT", "DINT", "WORD", "BYTE", "DWORD"].includes(tag.dataType)) {
      raw = Math.round(raw);
    }

    return raw;
  }

  async function submitWrite() {
    if (!editingTag) return;
    try {
      setBusyId(editingTag.id);

      let payload = coerceValueForTag(editingTag, textValue, sliderValue);
      console.log("Coerced payload:", payload, "type:", typeof payload); // 👈 DEBUG

      if (typeof payload === "number" && isNumericType(editingTag)) {
        payload = scaleEngToRaw(payload, editingTag);
        console.log("Scaled to raw:", payload); // 👈 DEBUG
      } else if (Array.isArray(payload)) {
        payload = payload.map(v => typeof v === "number" ? scaleEngToRaw(v, editingTag) : v);
      }

      await writeTag(editingTag.id, payload);
      toast.success(`Wrote value to ${editingTag.name}`);

      // Trigger read
      await fetch(`/api/read/tag/${editingTag.id}`, { method: 'POST' });

      setOpen(false);
      setEditingTag(null);
    } catch (e: any) {
      toast.error(e?.message || "Write failed");
    } finally {
      setBusyId(null);
    }
  }

  // ENTER to submit in modal input/textarea
  function onModalKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submitWrite();
    }
  }

  // Write when slider is released (mouse up / touch end)
  async function onSliderCommit() {
    if (!editingTag) return;
    // avoid double-trigger if both mouseup and change fire close together
    const now = Date.now();
    if (now - lastSliderWriteRef.current < 150) return;
    lastSliderWriteRef.current = now;

    // If the text input has something, we still consider slider the source only if text is blank
    const raw = textValue.trim();
    const valueToWrite = raw.length ? undefined : sliderValue;
    try {
      setBusyId(editingTag.id);
      const payload = coerceValueForTag(editingTag, raw, valueToWrite ?? sliderValue);
      await writeTag(editingTag.id, payload);
      toast.success(`Wrote value to ${editingTag.name}`);
    } catch (e: any) {
      toast.error(e?.message || "Write failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <div className="border rounded-xl max-h-[70vh] overflow-auto">
        <table className="table">
          <thead className="sticky top-0 bg-white">
            <tr>
              <th>Name</th>
              <th>Value</th>
              <th>Quality</th>
              <th>Updated</th>
              <th>Write</th>
            </tr>
          </thead>
          <tbody>
            {tagsList.map((t) => {
              const val = safeParse(t.lastValue);
              const isBool = t.dataType === "BOOL" && t.amount === 1;
              const boolVal = typeof val === "boolean" ? val : false;
              const disabled = t.readOnly || busyId === t.id;

              return (
                <tr key={t.id}>
                  <td>{t.name}</td>
                  <td>
                    <pre className="text-xs whitespace-pre-wrap">
                      {val === null ? "—" : JSON.stringify(val)}
                    </pre>
                  </td>
                  <td>{t.quality ?? "—"}</td>
                  <td className="text-xs text-gray-500">
                    {new Date(t.updatedAt).toLocaleString()}
                  </td>
                  <td>
                    {isBool ? (
                      <label className="label flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={boolVal}
                          disabled={disabled}
                          onChange={(e) => writeBool(t, e.target.checked)}
                        />
                        <span className="text-sm">{boolVal ? "ON" : "OFF"}</span>
                      </label>
                    ) : (
                      <button
                        className="btn"
                        disabled={disabled}
                        onClick={() => openWriteModal(t)}
                        title={t.readOnly ? "Read only" : "Write value"}
                      >
                        Write…
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Write modal for non-BOOL tags */}
      <Modal
        open={open}
        onClose={() => { setOpen(false); setEditingTag(null); }}
        title={
          editingTag
            ? `Write "${editingTag.name}" (${editingTag.dataType}${editingTag.amount > 1 ? ` x${editingTag.amount}` : ""})`
            : undefined
        }
        footer={
          <>
            <button className="btn" onClick={() => { setOpen(false); setEditingTag(null); }}>Cancel</button>
            <button
              className="btn"
              onClick={submitWrite}
              disabled={!editingTag || busyId === editingTag?.id}
              title="Enter to submit"
            >
              Write
            </button>
          </>
        }
      >
        {editingTag && (
          <div className="space-y-3">
            {editingTag.amount > 1 ? (
              <>
                <label className="label">Value (JSON array)</label>
                <textarea
                  className="input"
                  rows={4}
                  value={textValue}
                  onChange={(e) => setTextValue(e.target.value)}
                  onKeyDown={onModalKeyDown}
                  placeholder='[1,2,3]'
                />
              </>
            ) : isNumericType(editingTag) ? (
              <>
                <label className="label">Value</label>
                <input
                  className="input"
                  value={textValue}
                  onChange={(e) => setTextValue(e.target.value)}
                  onKeyDown={onModalKeyDown} // ENTER writes
                  placeholder="Enter number… (or use the slider below)"
                />
                <RangeForTag
                  tag={editingTag}
                  value={sliderValue}
                  onChange={setSliderValue}
                  onCommit={onSliderCommit}   // slider release writes
                />
                <div className="text-xs text-gray-500">
                  Tip: leave the text blank to use the slider value directly.
                </div>
              </>
            ) : (
              <>
                <label className="label">Value</label>
                <input
                  className="input"
                  value={textValue}
                  onChange={(e) => setTextValue(e.target.value)}
                  onKeyDown={onModalKeyDown} // ENTER writes
                  placeholder="Enter value…"
                />
              </>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}

function RangeForTag({
  tag, value, onChange, onCommit
}: {
  tag: Tag;
  value: number;
  onChange: (n: number) => void;
  onCommit: () => void; // fire when user finishes slide
}) {
  const { min, max, step } = getRange(tag);
  const v = Math.min(Math.max(value, min), max);

  return (
    <div className="space-y-2">
      <input
        type="range"
        className="w-full"
        min={min}
        max={max}
        step={step}
        value={v}
        onChange={(e) => onChange(Number(e.target.value))}
        onMouseUp={onCommit}
        onTouchEnd={onCommit}
        onKeyUp={(e) => { if (e.key === "Enter") onCommit(); }} // Enter from slider also writes
      />
      <div className="text-xs text-gray-600">
        Range: {min} … {max} (step {step}) · Current: <b>{v}</b>
      </div>
    </div>
  );
}
