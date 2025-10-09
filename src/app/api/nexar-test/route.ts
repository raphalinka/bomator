export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { resolveWithOctopart } from "@/lib/octopart-resolver";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "LM317T";

  try {
    const map = await resolveWithOctopart([q], "EUR");
    const hit = map.get(q);
    return NextResponse.json({ q, ok: Boolean(hit?.link), hit }, { status: 200 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ q, error: msg }, { status: 500 });
  }
}
