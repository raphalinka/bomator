export const runtime = "nodejs";
import { NextResponse } from "next/server";

export async function GET() {
  const url = process.env.SUPABASE_URL || null;
  const pub = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || null;
  const srv = process.env.SUPABASE_ANON_KEY || null;

  function mask(v?: string|null) {
    if (!v) return null;
    return v.length > 10 ? v.slice(0,6) + "…" + v.slice(-4) : "***";
  }

  return NextResponse.json({
    SUPABASE_URL: url,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: mask(pub),
    SUPABASE_ANON_KEY: mask(srv),
    sameKeys: !!pub && !!srv && pub === srv
  });
}
