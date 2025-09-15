"use client";
import { readNow, writeTag, deleteTag } from "@/lib/api";
import { useState } from "react";
import toast from "react-hot-toast";
import type { Tag } from "@/types";

function safeParse(v: string | null) {
  if (v == null) return null;
  try { return JSON.parse(v); } catch { return v; }
}

export default function TagTable({
  tags,
  onMutate,
}: {
  tags: Tag[];
  onMutate: () => void;
}) {
  const [busyId, setBusyId] = useState<number | null>(null);
  const [writeValues, setWriteValues] = useState<Record<number, string>>({});

  async function doRead(t: Tag) {
    try {
      setBusyId(t.id);
      const d = await readNow(t.id);
      toast.success(`Read: ${JSON.stringify(d.value)}`);
      onMutate();
    } catch (e: any) {
      toast.error(e.message || "Read failed");
    } finally {
      setBusyId(null);
    }
  }

  async function doWrite(t: Tag) {
    if (t.readOnly) return;
    try {
      setBusyId(t.id);
      const raw = writeValues[t.id];
      const value =
        raw?.trim()?.startsWith("[") || raw?.trim()?.startsWith("{")
          ? JSON.parse(raw)
          : isNaN(Number(raw))
          ? raw
          : Number(raw);
      await writeTag(t.id, value);
      toast.success("Write ok");
    } catch (e: any) {
      toast.error(e.message || "Write failed");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(t: Tag) {
    if (!confirm(`Delete tag "${t.name}"?`)) return;
    try {
      setBusyId(t.id);
      await deleteTag(t.id);
      onMutate();
    } catch (e: any) {
      toast.error(e.message || "Delete failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <table className="table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Address</th>
          <th>Type</th>
          <th>Last Value</th>
          <th>Quality</th>
          <th>Updated</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {(tags ?? []).map((t) => {
          const val = safeParse(t.lastValue);
          const addr =
            t.area === "DB"
              ? `DB${t.dbNumber}, ${t.start} (${t.amount})`
              : `${t.area} ${t.start} (${t.amount})`;
          return (
            <tr key={t.id}>
              <td>{t.name}</td>
              <td><code>{addr}</code></td>
              <td>{t.dataType}</td>
              <td>
                <pre className="text-xs whitespace-pre-wrap">
                  {val === null ? "—" : JSON.stringify(val)}
                </pre>
              </td>
              <td>{t.quality ?? "—"}</td>
              <td className="text-xs text-gray-500">
                {new Date(t.updatedAt).toLocaleString()}
              </td>
              <td className="space-y-2">
                <div className="flex gap-2">
                  <button className="btn" disabled={busyId === t.id} onClick={() => doRead(t)}>Read</button>
                  <button className="btn" disabled={busyId === t.id || t.readOnly} onClick={() => doWrite(t)}>Write</button>
                  <button className="btn" disabled={busyId === t.id} onClick={() => remove(t)}>Delete</button>
                </div>
                <input
                  className="input"
                  placeholder={t.readOnly ? "readOnly" : "value or JSON"}
                  disabled={t.readOnly}
                  value={writeValues[t.id] ?? ""}
                  onChange={(e) =>
                    setWriteValues((v) => ({ ...v, [t.id]: e.target.value }))
                  }
                />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
