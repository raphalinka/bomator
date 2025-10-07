"use client";
import Image from "next/image";
import NavBar from "@/components/NavBar";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main>
      <NavBar />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <Image src="/graphics/hero-grid.svg" alt="" width={1200} height={800} className="absolute inset-0 h-full w-full object-cover" priority />
        <div className="container relative py-20 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <div className="badge mb-4">MVP · AI for Manufacturing</div>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.1]">
              Generate complete BOMs from natural-language specs
            </h1>
            <p className="mt-6 text-slate-300 text-lg">
              Type: <i>“I need a BOM for a two-slice toaster”</i> → get an Excel with parts, links and prices.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="/login"><Button>Try for free</Button></a>
              <a href="#how"><Button variant="ghost">How it works</Button></a>
            </div>
            <div className="mt-4 text-sm text-slate-400">No card on Free · Export .xlsx · Vendor integrations</div>
          </div>

          <div className="relative">
            <div className="absolute -inset-8 blur-3xl rounded-full bg-indigo-500/20" />
            <div className="relative card overflow-hidden p-0">
              <Image
                src="/illustrations/toaster-iso.svg"
                alt="Toaster mockup"
                width={900}
                height={600}
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* HOW */}
      <section id="how" className="container py-16">
        <h2 className="text-2xl md:text-3xl font-bold">How it works</h2>
        <div className="mt-6 grid md:grid-cols-3 gap-6">
          {[
            { title: "1. Describe the device", desc: "Provide requirements in natural language: functions, materials, constraints." },
            { title: "2. AI composes the BOM", desc: "The model creates a hierarchical list of parts and parameters." },
            { title: "3. Links & prices", desc: "The system selects products and generates an Excel to download." },
          ].map((f, i) => (
            <div key={i} className="card">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-indigo-500/20 ring-1 ring-indigo-400/30 flex items-center justify-center">{i + 1}</div>
                <h3 className="font-semibold">{f.title}</h3>
              </div>
              <p className="mt-3 text-slate-300 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="container py-16">
        <h2 className="text-2xl md:text-3xl font-bold">Pricing</h2>
        <p className="mt-2 text-slate-300">Start on Free, upgrade later.</p>
        <div className="mt-8 grid md:grid-cols-3 gap-6">
          <div className="card">
            <h3 className="text-lg font-semibold">Free</h3>
            <div className="mt-2 text-3xl font-extrabold">€0<span className="text-base font-medium text-slate-400">/mo</span></div>
            <ul className="mt-4 space-y-2 text-sm text-slate-300">
              <li>3 BOM generations/mo</li><li>Export to .xlsx</li><li>Basic product matching</li>
            </ul>
            <a href="/login"><Button className="mt-6" variant="ghost">Get started</Button></a>
          </div>
          <div className="card border-indigo-400">
            <h3 className="text-lg font-semibold">Pro</h3>
            <div className="mt-2 text-3xl font-extrabold">€79<span className="text-base font-medium text-slate-400">/mo</span></div>
            <ul className="mt-4 space-y-2 text-sm text-slate-300">
              <li>Unlimited BOMs (fair use)</li><li>Advanced matching + alternates</li><li>Live prices</li><li>Cost reports</li>
            </ul>
            <a href="/login"><Button className="mt-6">Choose Pro</Button></a>
          </div>
          <div className="card">
            <h3 className="text-lg font-semibold">Team</h3>
            <div className="mt-2 text-3xl font-extrabold">€279<span className="text-base font-medium text-slate-400">/mo</span></div>
            <ul className="mt-4 space-y-2 text-sm text-slate-300">
              <li>Up to 10 users</li><li>Roles & permissions</li><li>Export CSV/Excel/JSON + API</li><li>Priority generations</li>
            </ul>
            <a href="/login"><Button className="mt-6" variant="ghost">Contact</Button></a>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10">
        <div className="container py-8 text-sm text-slate-400 flex items-center justify-between">
          <span>© {new Date().getFullYear()} BOMator</span>
          <div className="flex gap-4">
            <a href="#" className="hover:text-white">Privacy Policy</a>
            <a href="#" className="hover:text-white">Terms</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
