export const runtime = "nodejs";
import { NextResponse } from "next/server";
export async function GET() {
  const key = process.env.SUPABASE_ANON_KEY || "";
  return NextResponse.json({
    supabaseUrl: process.env.SUPABASE_URL || null,
    appUrl: process.env.NEXT_PUBLIC_APP_URL || null,
    anonKeyPresent: !!key,
    anonKeyPrefix: key ? key.slice(0, 12) + "…" : null,
    anonKeyLength: key.length,
  });
}
