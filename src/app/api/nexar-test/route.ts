export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { resolveWithOctopart } from "@/lib/octopart-resolver";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") || "LM317T";
  try {
    const map = await resolveWithOctopart([q], "EUR");
    const hit = map.get(q);
    return NextResponse.json({ q, ok: !!hit?.link, hit }, { status: 200 });
  } catch (e:any) {
    return NextResponse.json({ q, error: e?.message || String(e) }, { status: 500 });
  }
}
