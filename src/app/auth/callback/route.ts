export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  // Pobierz magazyn ciastek Next.js
  const store = await cookies();

  // Klient Supabase z jawnie podanymi getAll/setAll (zalecane na Vercel)
  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return store.getAll().map((c) => ({ name: c.name, value: c.value }));
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            store.set(name, value, options);
          });
        },
      },
    }
  );

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    // Krótka diagnostyka do logów Vercel
    console.log("AUTH CALLBACK exchange", {
      hasCode: !!code,
      error: error?.message ?? null,
      userId: data?.user?.id ?? null,
    });
    if (error) {
      // Jeśli Supabase krzyczy „invalid requested path” albo podobne – pokażmy to w query,
      // żeby łatwiej było zobaczyć w przeglądarce:
      return NextResponse.redirect(new URL(`/login?auth_error=${encodeURIComponent(error.message)}`, url.origin));
    }
  } else {
    console.log("AUTH CALLBACK called without code param");
  }

  return NextResponse.redirect(new URL("/dashboard", url.origin));
}
