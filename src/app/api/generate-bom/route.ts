export const dynamic = "force-dynamic";

type Item = {
  part: string;
  specification?: string;
  quantity: number;
  unit: string;
  unitPrice?: number; // in EUR
  supplier?: string;
  link?: string;
};

export async function POST(req: Request) {
  const { prompt } = await req.json();

  // Very simple mock logic just to have something deterministic
  const items: Item[] = [
    { part: "Heating element 600W 230V", quantity: 2, unit: "pcs", unitPrice: 42, supplier: "ElectroVendor", link: "https://example.com/he600" },
    { part: "Bimetal thermostat 250°C", quantity: 1, unit: "pc", unitPrice: 18.5, supplier: "Parts4U", link: "https://example.com/thermo250" },
    { part: "Silicone wire 1.5mm²", quantity: 2, unit: "m", unitPrice: 4.2, supplier: "WireStore", link: "https://example.com/silwire" },
    { part: "Stainless steel sheet 1mm", quantity: 1, unit: "pc", unitPrice: 55, supplier: "MetalMart", link: "https://example.com/steel1mm" },
  ];

  const subtotal = items.reduce((s, it) => s + (it.unitPrice ?? 0) * it.quantity, 0);
  const response = {
    prompt,
    currency: "EUR",
    itemCount: items.length,
    subtotal,
    items,
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
