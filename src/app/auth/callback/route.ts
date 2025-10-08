export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

function html(body: string) {
  return new Response(`<!doctype html><meta charset="utf-8"><body style="font-family:ui-sans-serif;-webkit-font-smoothing:antialiased;background:#0b1220;color:#e5e7eb;padding:24px"><pre style="white-space:pre-wrap">${body}</pre></body>`, {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const store = await cookies();

  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
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

  const beforeCookies = store.getAll().map(c => ({ name: c.name, value: (c.value ?? "").slice(0, 12) + "…" }));

  let exchangeError: string | null = null;
  let userId: string | null = null;

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    exchangeError = error?.message ?? null;
    userId = data?.user?.id ?? null;
  }

  const { data: { user }, error: getUserError } = await supabase.auth.getUser();
  const afterCookies = store.getAll().map(c => ({ name: c.name, value: (c.value ?? "").slice(0, 12) + "…" }));

  // Jeśli wszystko OK — normalny redirect do dashboard
  if (!exchangeError && user) {
    return NextResponse.redirect(new URL("/dashboard", url.origin));
  }

  // W przeciwnym razie — pokaż twardą diagnostykę (zostaje w przeglądarce)
  return html(JSON.stringify({
    message: "Auth callback diagnostics",
    url: url.toString(),
    hasCode: !!code,
    exchangeError,
    userId,
    getUserError: getUserError?.message ?? null,
    cookiesBefore: beforeCookies,
    cookiesAfter: afterCookies,
    env: {
      SUPABASE_URL: process.env.SUPABASE_URL,
      APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    },
  }, null, 2));
}
