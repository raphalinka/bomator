"use client";
import { createBrowserClient } from "@supabase/ssr";

export const supabaseBrowser = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // local dev on http://localhost needs non-secure cookies
      cookieOptions: {
        secure: false,
        sameSite: "lax",
        path: "/",
      },
    }
  );
