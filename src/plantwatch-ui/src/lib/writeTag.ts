import { getSocket } from "@/lib/socket";

export async function writeTag(tagId: number, value: any) {
  // 1) intenta por socket (si tu gateway soporta "tag:write")
  try {
    const s = getSocket?.();
    if (s) {
      await new Promise<void>((resolve, reject) => {
        s.timeout(3000).emit("tag:write", { tagId, value }, (err: any, ack?: { ok: boolean; error?: string }) => {
          if (err) return reject(err);
          if (ack?.ok) return resolve();
          return reject(new Error(ack?.error || "Write failed"));
        });
      });
      return;
    }
  } catch (e) {
    // fallback a REST
  }
  // 2) fallback REST
  const r = await fetch(`/api/write/tag/${tagId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value }),
  });
  const jr = await r.json().catch(() => ({}));
  if (!r.ok || jr?.ok === false) throw new Error(jr?.error || `HTTP ${r.status}`);
}
