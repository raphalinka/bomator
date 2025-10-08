export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const currencies = ["EUR", "USD", "GBP"] as const;
type Currency = typeof currencies[number];

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
  currency: Currency;
  items: BomItem[];
  disclaimer: string;
};

function isRecord(u: unknown): u is Record<string, unknown> {
  return typeof u === "object" && u !== null && !Array.isArray(u);
}

function asString(u: unknown, fallback = ""): string {
  return typeof u === "string" ? u : u == null ? fallback : String(u);
}

function asNumber(u: unknown, fallback = 0): number {
  const n = typeof u === "number" ? u : Number(u);
  return Number.isFinite(n) ? n : fallback;
}

function isCurrency(u: unknown): u is Currency {
  return typeof u === "string" && (currencies as readonly string[]).includes(u);
}

function coerceItem(u: unknown): BomItem {
  const r: Record<string, unknown> = isRecord(u) ? u : {};
  return {
    part: asString(r.part),
    qty: asNumber(r.qty, 1),
    unit: asString(r.unit, "pcs"),
    spec: asString(r.spec),
    suggested_product: asString(r.suggested_product),
    supplier: asString(r.supplier),
    link: asString(r.link),
    unit_price: asNumber(r.unit_price, 0),
    notes: r.notes === undefined ? undefined : asString(r.notes),
  };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as unknown;
    const prompt = isRecord(body) ? asString(body.prompt) : "";
    const currencyReq = isRecord(body) ? body.currency : undefined;
    const currency: Currency = isCurrency(currencyReq) ? currencyReq : "EUR";

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
      "Always include specific, buyable products (SKU/MPN) and realistic unit prices in the requested currency."
    ].join(" ");

    const user = `Task: Create a complete BOM.\nDevice description: ${prompt}\nCurrency: ${currency}\nReturn ONLY valid JSON.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
    });

    const content = completion.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content) as unknown;

    let safe: BomResponse = {
      title: "Generated BOM",
      currency,
      items: [],
      disclaimer: "Prices and availability are indicative; verify critical components with suppliers."
    };

    if (isRecord(parsed)) {
      safe = {
        title: asString(parsed.title, "Generated BOM"),
        currency: isCurrency(parsed.currency) ? parsed.currency : currency,
        items: Array.isArray((parsed as Record<string, unknown>).items)
          ? ((parsed as Record<string, unknown>).items as unknown[]).map(coerceItem)
          : [],
        disclaimer: asString(parsed.disclaimer, "Prices and availability are indicative; verify critical components with suppliers.")
      };
    }

    return new Response(JSON.stringify(safe), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  } catch (err) {
    const msg = (err as Error)?.message || "OpenAI request failed";
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
}
