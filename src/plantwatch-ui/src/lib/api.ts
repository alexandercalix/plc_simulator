import { Plc, Tag } from "@/types";



const API = process.env.NEXT_PUBLIC_API || "http://localhost:3000";


async function json<T>(r: Response): Promise<T> {
if (!r.ok) throw new Error(await r.text());
return r.json();
}


export async function listPlcs(): Promise<Plc[]> {
return json(await fetch(`${API}/plcs`, { cache: "no-store" }));
}


export async function getPlc(id: number): Promise<Plc> {
return json(await fetch(`${API}/plcs/${id}`, { cache: "no-store" }));
}


export async function createPlc(payload: Partial<Plc>) {
return json(await fetch(`${API}/plcs`, {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify(payload),
}));
}


export async function patchPlc(id: number, payload: Partial<Plc>) {
return json(await fetch(`${API}/plcs/${id}`, {
method: "PATCH",
headers: { "Content-Type": "application/json" },
body: JSON.stringify(payload),
}));
}


export async function deletePlc(id: number) {
return json(await fetch(`${API}/plcs/${id}`, { method: "DELETE" }));
}


export async function listTags(): Promise<Tag[]> {
return json(await fetch(`${API}/tags`, { cache: "no-store" }));
}


export async function createTag(payload: Partial<Tag>) {
return json(await fetch(`${API}/tags`, {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify(payload),
}));
}


export async function patchTag(id: number, payload: Partial<Tag>) {
return json(await fetch(`${API}/tags/${id}`, {
method: "PATCH",
headers: { "Content-Type": "application/json" },
body: JSON.stringify(payload),
}));
}


export async function deleteTag(id: number) {
return json(await fetch(`${API}/tags/${id}`, { method: "DELETE" }));
}


export async function readNow(tagId: number) {
const r = await fetch(`${API}/read/tag/${tagId}`, { method: "POST" });
const j = await r.json();
if (!j.ok) throw new Error(j.error || "read failed");
return j.data as { tagId: number; plcId: number; ts: number; value: any; quality: "GOOD" | "BAD" };
}


export async function writeTag(tagId: number, value: any) {
const r = await fetch(`${API}/write`, {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({ tagId, value }),
});
const j = await r.json();
if (!j.ok) throw new Error("write failed");
return j;
}