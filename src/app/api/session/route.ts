export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export async function GET() {
  const cookieStore = await cookies();
  const all = cookieStore.getAll().map(c => ({ name: c.name, value: c.value?.slice(0, 12) + "…" }));

  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user }, error } = await supabase.auth.getUser();

  return NextResponse.json({
    cookies: all,
    hasSbAuth: all.some(c => c.name.includes("sb-") && c.name.includes("-auth-token")),
    user,
    error: error?.message ?? null,
  });
}
