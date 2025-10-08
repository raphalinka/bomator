"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import NavBar from "@/components/NavBar";

export default function LoginPage() {
  const supabase = supabaseBrowser();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({ provider: "google" });
  };

  const signInWithMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ email });
    setLoading(false);
    if (!error) setSent(true); else alert(error.message);
  };

  return (
    <main>
      <NavBar />
      <div className="container py-16 grid place-items-center">
        <div className="card w-full max-w-md">
          <h1 className="text-2xl font-bold">Sign in</h1>
          <p className="mt-2 text-slate-300 text-sm">Use Google or get a magic link.</p>

          <Button onClick={signInWithGoogle} className="w-full mt-6">Continue with Google</Button>

          <div className="my-6 h-px bg-white/10" />

          {sent ? (
            <div className="text-sm text-emerald-400">Magic link sent! Check your inbox.</div>
          ) : (
            <form onSubmit={signInWithMagicLink} className="space-y-3">
              <Input type="email" required value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="you@example.com" />
              <Button variant="ghost" disabled={loading} className="w-full">{loading ? "Sending…" : "Email me a magic link"}</Button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
