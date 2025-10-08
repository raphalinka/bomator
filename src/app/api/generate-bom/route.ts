export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

    if (!client.apiKey) {
      return new Response(JSON.stringify({ error: "Missing OPENAI_API_KEY" }), { status: 500 });
    }

    const schema = {
      type: "object",
      additionalProperties: false,
      required: ["title", "currency", "items", "disclaimer"],
      properties: {
        title: { type: "string" },
        currency: { type: "string", enum: ["EUR", "USD", "GBP"] },
        items: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["part","qty","unit","spec","suggested_product","supplier","link","unit_price"],
            properties: {
              part: { type: "string" },
              qty: { type: "number" },
              unit: { type: "string" },
              spec: { type: "string" },
              suggested_product: { type: "string" },
              supplier: { type: "string" },
              link: { type: "string" },
              unit_price: { type: "number" },
              notes: { type: "string" }
            }
          }
        },
        disclaimer: { type: "string" }
      }
    };

    const system = [
      "You are a hardware sourcing assistant that generates complete Bills of Materials (BOM).",
      "Return strictly valid JSON following the provided JSON Schema.",
      "Whenever possible include specific, buyable products (SKU/MPN) and supplier links.",
      "Prices should be realistic estimates in the requested currency; if unsure, approximate.",
      "Never include markdown fences."
    ].join(" ");

    const user = `Task: Create a complete BOM. Device description: ${prompt}. Currency: ${currency}.`;

    const resp = await client.responses.create({
      model: "gpt-4o-mini",
      input: `${system}\n\n${user}`,
      response_format: {
        type: "json_schema",
        json_schema: { name: "bom", schema, strict: true }
      }
    });

    const text = (resp as { output_text?: string }).output_text || "";
    const data = JSON.parse(text) as BomResponse;

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  } catch (err) {
    const msg = (err as Error)?.message || "OpenAI request failed";
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
}
