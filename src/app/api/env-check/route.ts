export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

export async function GET() {
  const mask = (v?: string) => v ? `${v.slice(0,4)}…(${v.length})` : "MISSING";
  return NextResponse.json({
    OPENAI_API_KEY: mask(process.env.OPENAI_API_KEY),
    NEXAR_CLIENT_ID: mask(process.env.NEXAR_CLIENT_ID),
    NEXAR_CLIENT_SECRET: mask(process.env.NEXAR_CLIENT_SECRET),
    NEXAR_SCOPE: process.env.NEXAR_SCOPE || "MISSING"
  });
}
