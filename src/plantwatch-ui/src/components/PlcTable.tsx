"use client";
import Link from "next/link";
import { patchPlc, deletePlc } from "@/lib/api";
import { useState } from "react";
import toast from "react-hot-toast";
import StatusPill from "./StatusPill";
import type { Plc } from "@/types";


export default function PlcTable({ plcs, onMutate }: { plcs: Plc[]; onMutate: () => void }) {
    const [busy, setBusy] = useState<number | null>(null);


    async function toggleEnabled(p: Plc) {
        try { setBusy(p.id); await patchPlc(p.id, { enabled: !p.enabled }); onMutate(); }
        catch (e: any) { toast.error(e.message || "Failed to toggle"); }
        finally { setBusy(null); }
    }


    async function rename(p: Plc) {
        const name = prompt("New PLC name", p.name) ?? p.name;
        if (!name || name === p.name) return;
        try { setBusy(p.id); await patchPlc(p.id, { name }); onMutate(); }
        catch (e: any) { toast.error(e.message || "Rename failed"); }
        finally { setBusy(null); }
    }


    async function remove(p: Plc) {
        if (!confirm(`Delete PLC "${p.name}"?`)) return;
        try { setBusy(p.id); await deletePlc(p.id); onMutate(); }
        catch (e: any) { toast.error(e.message || "Delete failed"); }
        finally { setBusy(null); }
    }


    return (
        <table className="table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Status</th>
                    <th>IP</th>
                    <th>Rack/Slot</th>
                    <th>Type</th>
                    <th>Enabled</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
                {plcs.map(p => (
                    <tr key={p.id}>
                        <td><Link className="text-blue-600" href={`/plc/${p.id}`}>{p.name}</Link></td>
                        <td><StatusPill status={p.status} /></td>
                        <td>{p.ip}:{p.port}</td>
                        <td>{p.rack}/{p.slot}</td>
                        <td>{p.type}</td>
                        <td>
                            <button className="btn" disabled={busy === p.id} onClick={() => toggleEnabled(p)}>
                                {p.enabled ? "Disable" : "Enable"}
                            </button>
                        </td>
                        <td className="flex gap-2">
                            <button className="btn" disabled={busy === p.id} onClick={() => rename(p)}>Rename</button>
                            <button className="btn" disabled={busy === p.id} onClick={() => remove(p)}>Delete</button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}