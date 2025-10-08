export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const store = await cookies();

  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookieEncoding: "base64url",
      cookies: {
        getAll() {
          return store.getAll().map((c) => ({ name: c.name, value: c.value }));
        },
        setAll(list) {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        },
      },
    }
  );

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    console.log("AUTH CALLBACK", { error: error?.message ?? null, userId: data?.user?.id ?? null });
    if (error) return NextResponse.redirect(new URL("/login?auth_error=" + encodeURIComponent(error.message), url.origin));
  }

  return NextResponse.redirect(new URL("/dashboard", url.origin));
}
