export const dynamic = "force-dynamic";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import NavBar from "@/components/NavBar";
import Banner from "./Banner";
import BOMClient from "./BOMClient";
import { SignOutButton } from "./signout";

export default async function DashboardPage() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll().map((c) => ({ name: c.name, value: c.value }));
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main>
        <NavBar />
        <div className="container py-16">
          <h1 className="text-2xl font-bold">Not signed in</h1>
          <p className="text-slate-300 mt-2">Go to <a href="/login" className="underline">/login</a></p>
        </div>
      </main>
    );
  }

  return (
    <main>
      <NavBar />
      <div className="container py-10 space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <div className="text-sm text-slate-300 flex items-center gap-3">
            <span>{user.email}</span>
            <SignOutButton />
          </div>
        </div>
        <Banner />
        <BOMClient />
      </div>
    </main>
  );
}
