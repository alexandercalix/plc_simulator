import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.NEXT_PUBLIC_API ?? "http://localhost:3000";

// GET /api/tags?q=...&plcId=4
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").toLowerCase();
  const plcId = searchParams.get("plcId");

  try {
    // 1) fetch PLC(s) from your backend
    let plcs: any[] = [];
    if (plcId) {
      const r = await fetch(`${BACKEND}/plcs/${plcId}`, { cache: "no-store" });
      if (!r.ok) return NextResponse.json([]);
      const p = await r.json(); // single PLC object (with tags)
      plcs = [p];
    } else {
      const r = await fetch(`${BACKEND}/plcs`, { cache: "no-store" });
      if (!r.ok) return NextResponse.json([]);
      plcs = await r.json(); // array of PLCs (each has tags[])
    }

    // 2) flatten tags
    let rows = plcs.flatMap((p: any) =>
      (p.tags ?? []).map((t: any) => ({
        id: t.id,
        name: t.name,
        plcId: p.id,               // ensure source PLC id/name
        plcName: p.name ?? `PLC ${p.id}`,
        dataType: t.dataType ?? null,
        unit: t.unit ?? null       // your payload may not include unit; ok to be null
      }))
    );

    // 3) filter by query (name or plc name)
    if (q) rows = rows.filter(r => (`${r.name} ${r.plcName}`).toLowerCase().includes(q));

    return NextResponse.json(rows);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
