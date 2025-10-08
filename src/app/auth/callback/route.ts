export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  if (code) {
    const supabase = createRouteHandlerClient({ cookies });
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    console.log("exchangeCodeForSession:", { hasCode: !!code, error: error?.message ?? null, sessionUserId: data?.user?.id ?? null });
  } else {
    console.log("callback hit without code");
  }

  return NextResponse.redirect(new URL("/dashboard", url.origin));
}
