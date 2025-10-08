export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const store = await cookies();

  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookieEncoding: "base64url",
      cookies: {
        getAll() { return store.getAll().map(c => ({ name: c.name, value: c.value })); },
        setAll(list) { list.forEach(({ name, value, options }) => store.set(name, value, options)); },
      },
    }
  );

  // Wylogowanie w Supabase (czyści sesję po swojej stronie)
  await supabase.auth.signOut();

  // Dodatkowe czyszczenie wszystkich kawałków cookies (na wszelki wypadek)
  store.getAll().forEach(c => {
    if (c.name.includes("sb-") && c.name.includes("-auth-token")) {
      store.set(c.name, "", { path: "/", maxAge: 0 });
    }
  });

  // Twardy redirect na /login (bez cache)
  const res = NextResponse.redirect(new URL("/login", url.origin), 302);
  res.headers.set("Cache-Control", "no-store");
  return res;
}
