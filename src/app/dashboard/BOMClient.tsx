"use client";
import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type LinkStatus = "ok" | "broken" | "missing";
type BomItem = {
  part: string;
  qty: number;
  unit: string;
  spec: string;
  suggested_product: string;
  supplier: string;
  link: string;
  unit_price: number;
  notes?: string;
  link_status?: LinkStatus;
  alt_link?: string;
};

type BomApiResponse = {
  title: string;
  currency: "EUR" | "USD" | "GBP";
  items: BomItem[];
  disclaimer: string;
};

export default function BOMClient() {
  const [prompt, setPrompt] = useState(
    "I need a BOM for a two-slice toaster with thermostat and stainless-steel housing"
  );
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<BomApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const itemCount = useMemo(() => data?.items.length ?? 0, [data]);
  const subtotal = useMemo(
    () => (data?.items ?? []).reduce((s, it) => s + (Number(it.unit_price) || 0) * (Number(it.qty) || 0), 0),
    [data]
  );

  const sortedItems = useMemo(() => {
    if (!data) return [];
    const rank = (s?: LinkStatus) => (s === "ok" ? 0 : s === "broken" ? 1 : 2);
    return [...data.items].sort((a, b) => rank(a.link_status) - rank(b.link_status));
  }, [data]);

  const generate = async () => {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch("/api/generate-bom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, currency: "EUR" }),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `HTTP ${res.status}`);
      }
      const json = (await res.json()) as BomApiResponse;
      if (!json || !Array.isArray(json.items)) {
        throw new Error("Invalid response shape from /api/generate-bom");
      }
      setData(json);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to generate");
      console.error("[BOM] generate error:", e);
    } finally {
      setLoading(false);
    }
  };

  const exportXlsx = async () => {
    if (!data) return;
    const payload = {
      prompt,
      currency: data.currency,
      items: data.items.map((it) => ({
        part: it.part,
        specification: it.spec,
        quantity: it.qty,
        unit: it.unit,
        unitPrice: it.unit_price,
        supplier: it.supplier,
        link: it.link_status === "ok" ? it.link : (it.alt_link || it.link),
      })),
      subtotal,
    };
    const res = await fetch("/api/export-xlsx", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const t = await res.text();
      alert(`Export failed: ${t}`);
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bom.xlsx";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="mt-8">
      <Card>
        <label className="block font-semibold">Device description</label>
        <Textarea
          className="mt-2"
          rows={4}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        <div className="mt-3 flex gap-3">
          <Button onClick={generate} disabled={loading}>
            {loading ? "Generating…" : "Generate BOM"}
          </Button>
          <Button variant="ghost" onClick={exportXlsx} disabled={!data}>
            Download .xlsx
          </Button>
        </div>
        {error && (
          <div className="mt-3 text-sm text-rose-400 font-semibold">
            {error}
          </div>
        )}
      </Card>

      {data && (
        <Card className="mt-6 overflow-hidden">
          <div className="px-6 pt-6 text-sm text-slate-300">
            <span className="font-semibold">{data.title}</span> • {itemCount} items • Subtotal: {data.currency}{" "}
            {subtotal.toFixed(2)}
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-800/60 text-left">
                <tr>
                  {["Part", "Specification", "Qty", "Unit", "Unit Price", "Line Total", "Supplier", "Link"].map(
                    (h) => (
                      <th key={h} className="px-4 py-2 border-b border-white/10">
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {sortedItems.map((it, i) => (
                  <tr key={i} className="border-t border-white/10">
                    <td className="px-4 py-2">{it.part}</td>
                    <td className="px-4 py-2">{it.spec}</td>
                    <td className="px-4 py-2">{it.qty}</td>
                    <td className="px-4 py-2">{it.unit}</td>
                    <td className="px-4 py-2">
                      {it.unit_price != null ? `${data.currency} ${it.unit_price}` : ""}
                    </td>
                    <td className="px-4 py-2">
                      {it.unit_price != null ? `${data.currency} ${(it.unit_price * it.qty).toFixed(2)}` : ""}
                    </td>
                    <td className="px-4 py-2">{it.supplier}</td>
                    <td className="px-4 py-2">
                      {it.link_status === "ok" && it.link ? (
                        <a className="text-emerald-300 underline" target="_blank" rel="noreferrer" href={it.link}>
                          Open
                        </a>
                      ) : it.alt_link ? (
                        <a className="text-amber-300 underline" target="_blank" rel="noreferrer" href={it.alt_link}>
                          Search
                        </a>
                      ) : (
                        <span className="text-rose-300">No link</span>
                      )}
                      {it.link_status && (
                        <span
                          className={
                            "ml-2 rounded px-1.5 py-0.5 text-[10px] " +
                            (it.link_status === "ok"
                              ? "bg-emerald-500/20 text-emerald-300"
                              : it.link_status === "broken"
                              ? "bg-amber-500/20 text-amber-300"
                              : "bg-rose-500/20 text-rose-300")
                          }
                        >
                          {it.link_status}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.disclaimer && (
            <div className="px-6 pb-6 pt-3 text-xs text-slate-400">{data.disclaimer}</div>
          )}
        </Card>
      )}
    </section>
  );
}
