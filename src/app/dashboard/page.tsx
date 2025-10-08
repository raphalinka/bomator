export const dynamic = "force-dynamic";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import NavBar from "@/components/NavBar";
import Banner from "./Banner";
import BOMClient from "./BOMClient";
import { SignOutButton } from "./signout";

export default async function DashboardPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main>
      <NavBar />
      <div className="container py-10 space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <div className="text-sm text-slate-300 flex items-center gap-3">
            <span>{user?.email}</span>
            <SignOutButton />
          </div>
        </div>
        <Banner />
        <BOMClient />
      </div>
    </main>
  );
}
