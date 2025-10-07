"use client";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Item = { part: string; specification?: string; quantity: number; unit: string; unitPrice?: number; supplier?: string; link?: string; };
type BomResponse = { prompt: string; currency: "EUR"|"USD"|"GBP"; itemCount: number; subtotal: number; items: Item[]; };

export default function BOMClient() {
  const [prompt, setPrompt] = useState("I need a BOM for a two-slice toaster with thermostat and stainless-steel housing");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<BomResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/generate-bom", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt }) });
      if (!res.ok) throw new Error(await res.text());
      setData(await res.json());
    } catch (e:any) { setError(e.message ?? "Failed to generate"); }
    finally { setLoading(false); }
  };

  const exportXlsx = async () => {
    if (!data) return;
    const res = await fetch("/api/export-xlsx", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    if (!res.ok) return alert("Export failed");
    const blob = await res.blob(); const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "bom.xlsx"; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  };

  return (
    <section className="mt-8">
      <Card>
        <label className="block font-semibold">Device description</label>
        <Textarea className="mt-2" rows={4} value={prompt} onChange={(e)=>setPrompt(e.target.value)} />
        <div className="mt-3 flex gap-3">
          <Button onClick={generate} disabled={loading}>{loading ? "Generating…" : "Generate BOM"}</Button>
          <Button variant="ghost" onClick={exportXlsx} disabled={!data}>Download .xlsx</Button>
        </div>
        {error && <div className="mt-3 text-sm text-rose-400 font-semibold">{error}</div>}
      </Card>

      {data && (
        <Card className="mt-6 overflow-hidden">
          <div className="px-6 pt-6 text-sm text-slate-300">{data.itemCount} items • Subtotal: {data.currency} {data.subtotal.toFixed(2)}</div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-800/60 text-left">
                <tr>
                  {["Part","Specification","Qty","Unit","Unit Price","Supplier","Link"].map(h=>(
                    <th key={h} className="px-4 py-2 border-b border-white/10">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.items.map((it, i)=>(
                  <tr key={i} className="border-t border-white/10">
                    <td className="px-4 py-2">{it.part}</td>
                    <td className="px-4 py-2">{it.specification ?? ""}</td>
                    <td className="px-4 py-2">{it.quantity}</td>
                    <td className="px-4 py-2">{it.unit}</td>
                    <td className="px-4 py-2">{it.unitPrice != null ? `${data.currency} ${it.unitPrice}` : ""}</td>
                    <td className="px-4 py-2">{it.supplier ?? ""}</td>
                    <td className="px-4 py-2">
                      {it.link ? <a className="text-brand-400 underline" target="_blank" rel="noreferrer" href={it.link}>Open</a> : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </section>
  );
}
