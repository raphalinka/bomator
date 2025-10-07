import * as React from "react";
import { cn } from "@/lib/cn";
export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn("w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 outline-none focus:ring-2 focus:ring-brand-500", props.className)} />;
}
