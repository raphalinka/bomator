"use client";
import { supabaseBrowser } from "@/lib/supabase/browser";

export function SignOutButton() {
  const supabase = supabaseBrowser();
  return (
    <button
      onClick={async ()=>{ await supabase.auth.signOut(); location.href="/login"; }}
      style={{ marginTop: 12, padding: "8px 16px", background: "#333", color: "white", borderRadius: 8 }}
    >
      Sign out
    </button>
  );
}

