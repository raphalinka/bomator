"use client";
import Image from "next/image";
export default function Banner() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10">
      <Image src="/graphics/hero-grid.svg" alt="" width={1600} height={220} className="h-40 w-full object-cover" />
      <div className="absolute inset-0 p-6 flex items-end bg-gradient-to-t from-slate-950/60 to-transparent">
        <div className="text-sm text-slate-200">Tip: Export your BOM as .xlsx</div>
      </div>
    </div>
  );
}
