import { NextRequest, NextResponse } from "next/server";
const BACKEND = process.env.NEXT_PUBLIC_API || "http://localhost:3000";

// POST /api/write/tag/:id  body: { value: any }
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const r = await fetch(`${BACKEND}/write/tag/${params.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const jr = await r.json().catch(() => ({}));
    return NextResponse.json(jr, { status: r.status });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
