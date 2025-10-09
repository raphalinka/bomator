export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { resolveWithCSE } from "@/lib/cse-resolver";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "LM317T";
  try {
    const link = await resolveWithCSE(q);
    return NextResponse.json({ q, link, ok: Boolean(link) });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ q, error: msg }, { status: 500 });
  }
}
