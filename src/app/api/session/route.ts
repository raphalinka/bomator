export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET() {
  const store = await cookies();

  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookieEncoding: "base64url",
      cookies: {
        getAll() {
          return store.getAll().map(c => ({ name: c.name, value: c.value }));
        },
        setAll(list) {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        },
      },
    }
  );

  const { data: { user }, error } = await supabase.auth.getUser();

  const masked = store.getAll().map(c => ({
    name: c.name,
    value: (c.value ?? "").slice(0, 12) + "…",
  }));

  return NextResponse.json({
    cookies: masked,
    hasSbAuth: masked.some(c => c.name.includes("-auth-token")),
    user,
    error: error?.message ?? null,
  });
}
