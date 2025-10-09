export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import OpenAI from "openai";
import { buildSearchLinks } from "@/lib/link-resolver";
import { resolveWithOctopart } from "@/lib/octopart-resolver";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const currencies = ["EUR", "USD", "GBP"] as const;
type Currency = typeof currencies[number];
type LinkStatus = "ok" | "broken" | "missing";

type SearchLinks = {
  digikey: string; mouser: string; rs: string; farnell: string; newark: string; amazon: string; aliexpress: string;
};

type BomItem = {
  part: string;
  qty: number;
  unit: string;
  spec: string;
  suggested_product: string; // include MPN/SKU if possible
  supplier: string;
  link: string;
  unit_price: number;
  notes?: string;
  link_status?: LinkStatus;
  alt_link?: string;
  search_links?: SearchLinks;
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
  // <<< KLUCZOWE: nadpisujemy link na "" na starcie >>>
  return {
    part: asString(r.part),
    qty: asNumber(r.qty, 1),
    unit: asString(r.unit, "pcs"),
    spec: asString(r.spec),
    suggested_product: asString(r.suggested_product),
    supplier: asString(r.supplier),
    link: "",                          // ignoruj link z modelu
    unit_price: asNumber(r.unit_price, 0),
    notes: r.notes === undefined ? undefined : asString(r.notes),
  };
}

// ——— MAIN ———
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as unknown;
    const prompt = isRecord(body) ? asString(body.prompt) : "";
    const currencyReq = isRecord(body) ? body.currency : undefined;
    const currency: Currency = isCurrency(currencyReq) ? currencyReq : "EUR";
    const detail = isRecord(body) ? Number((body as Record<string, unknown>).detail) || 3 : 3;

    if (!process.env.OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "Missing OPENAI_API_KEY" }), { status: 500 });
    }

    const system = [
      "You are a hardware sourcing assistant that generates complete Bills of Materials (BOM).",
      "Return STRICT JSON (no markdown) matching this shape:",
      JSON.stringify({
        title: "string",
        currency: "EUR|USD|GBP",
        items: [{
          part: "string",
          qty: 1,
          unit: "pcs",
          spec: "string",
          suggested_product: "string", // include MPN/SKU if possible
          supplier: "string",
          link: "https://...",        // (ignored by server; server will supply real links via Octopart)
          unit_price: 0
        }],
        disclaimer: "string"
      }),
      "Prefer reputable suppliers (Digi-Key, Mouser, RS Components, Farnell/Newark).",
      "Include realistic unit prices in the requested currency.",
      "Always include explicit MPNs where applicable in suggested_product.",
    ].join(" ");

    const user =
      `Task: Create a complete BOM.\n` +
      `Device description: ${prompt}\n` +
      `Currency: ${currency}\n` +
      `Level of detail: ${detail}/5 (1 = rough modules, 5 = exhaustive itemization)\n` +
      `Return ONLY valid JSON.`;

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
      const rawItems = Array.isArray((parsed as Record<string, unknown>).items)
        ? ((parsed as Record<string, unknown>).items as unknown[]).map(coerceItem)
        : [];
      safe = {
        title: asString(parsed.title, "Generated BOM"),
        currency: isCurrency(parsed.currency) ? parsed.currency : currency,
        items: rawItems,
        disclaimer: asString(parsed.disclaimer, safe.disclaimer),
      };
    }

    // —— OCTOPART FIRST (Nexar) —— //
    if (!process.env.NEXAR_CLIENT_ID || !process.env.NEXAR_CLIENT_SECRET) {
      // jeśli brak kluczy — tylko fallback „search buttons”, bez żadnych linków od modelu
      safe.items = safe.items.map((it) => {
        const q = (it.suggested_product || it.part).trim();
        return {
          ...it,
          link: "",
          link_status: "missing" as const,
          search_links: buildSearchLinks(q),
        };
      });
    } else {
      const queries = safe.items.map(it => (it.suggested_product || it.part).trim()).filter(Boolean);
      const map = await resolveWithOctopart(queries, safe.currency);
      safe.items = safe.items.map((it) => {
        const key = (it.suggested_product || it.part).trim();
        const hit = map.get(key);
        if (hit?.link) {
          // pewny link + ewentualna cena z oferty
          return {
            ...it,
            link: hit.link,
            link_status: "ok" as const,
            supplier: hit.supplier || it.supplier,
            suggested_product: hit.mpn ? `${hit.mpn}` : it.suggested_product,
            unit_price: (typeof hit.unit_price === "number" && hit.unit_price > 0) ? hit.unit_price : it.unit_price,
            search_links: buildSearchLinks(hit.mpn || key),
          };
        }
        // brak w Nexar? nie generuj losowego linku – tylko search buttons
        const q = key;
        return {
          ...it,
          link: "",
          link_status: "missing" as const,
          search_links: buildSearchLinks(q),
        };
      });

      // (opcjonalnie) włącz DDG fallback tylko gdy chcesz:
      if (process.env.ENABLE_DDG_FALLBACK === "1") {
        const { resolveBestProductUrl } = await import("@/lib/link-resolver");
        const repaired = await Promise.all(
          safe.items.map(async (it) => {
            if (it.link_status === "ok" && it.link) return it;
            const q = (it.suggested_product || it.part).trim();
            const best = await resolveBestProductUrl(it.supplier || "", q, q);
            if (best) return { ...it, link: best, link_status: "ok" as const };
            return it;
          })
        );
        safe.items = repaired;
      }
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
