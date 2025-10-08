export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
};
type BomResponse = {
  title: string;
  currency: "EUR" | "USD" | "GBP";
  items: BomItem[];
  disclaimer: string;
};

export async function POST(req: Request) {
  try {
    const { prompt, currency = "EUR" } = await req.json();

    if (!process.env.OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "Missing OPENAI_API_KEY" }), { status: 500 });
    }

    const system = [
      "You are a hardware sourcing assistant that generates complete Bills of Materials (BOM).",
      "Return STRICT JSON (no markdown) that matches this shape:",
      JSON.stringify({
        title: "string",
        currency: "EUR|USD|GBP",
        items: [{
          part: "string",
          qty: 1,
          unit: "pcs",
          spec: "string",
          suggested_product: "string",
          supplier: "string",
          link: "https://...",
          unit_price: 0
        }],
        disclaimer: "string"
      }),
      "Always include specific, buyable products where possible (SKU/MPN) and realistic unit prices in the requested currency."
    ].join(" ");

    const user = `Task: Create a complete BOM.\nDevice description: ${prompt}\nCurrency: ${currency}\nReturn ONLY valid JSON.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ],
      // wymusza czysty JSON (SDK/typy wspierają to stabilnie)
      response_format: { type: "json_object" },
      temperature: 0.4,
    });

    const content = completion.choices[0]?.message?.content || "{}";
    // Zabezpieczenie parsowania:
    const data = JSON.parse(content) as Partial<BomResponse>;

    // Minimalna walidacja i uzupełnienia:
    const safe: BomResponse = {
      title: data.title ?? "Generated BOM",
      currency: (["EUR","USD","GBP"] as const).includes((data.currency as any)) ? (data.currency as BomResponse["currency"]) : currency,
      items: Array.isArray(data.items) ? data.items.map((it: any) => ({
        part: String(it?.part ?? ""),
        qty: Number(it?.qty ?? 1),
        unit: String(it?.unit ?? "pcs"),
        spec: String(it?.spec ?? ""),
        suggested_product: String(it?.suggested_product ?? ""),
        supplier: String(it?.supplier ?? ""),
        link: String(it?.link ?? ""),
        unit_price: Number(it?.unit_price ?? 0),
        notes: it?.notes ? String(it.notes) : undefined,
      })) : [],
      disclaimer: String(data.disclaimer ?? "Prices and availability are indicative; verify critical components with suppliers.")
    };

    return new Response(JSON.stringify(safe), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  } catch (err) {
    const msg = (err as Error)?.message || "OpenAI request failed";
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
}
