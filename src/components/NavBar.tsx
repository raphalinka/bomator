"use client";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export default function NavBar() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 backdrop-blur supports-[backdrop-filter]:bg-slate-900/70">
      <div className="container h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/brand/logo.svg" alt="BOMator" width={28} height={28} priority />
          <span className="text-lg font-semibold tracking-tight">BOMator</span>
        </Link>
        <nav className="flex items-center gap-3">
          <Link href="/#how" className="text-sm text-slate-300 hover:text-white">How it works</Link>
          <Link href="/#pricing" className="text-sm text-slate-300 hover:text-white">Pricing</Link>
          <Link href="/login"><Button variant="ghost">Sign in</Button></Link>
        </nav>
      </div>
    </header>
  );
}
