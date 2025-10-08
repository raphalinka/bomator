export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const currencies = ["EUR", "USD", "GBP"] as const;
type Currency = typeof currencies[number];
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

// —— LINK VALIDATION —— //
const FETCH_TIMEOUT_MS = 5000;

function canonicalize(url: string): string {
  let s = url.trim();
  if (!s) return "";
  if (!/^https?:\/\//i.test(s)) s = "https://" + s;
  return s;
}
function supplierSearchFallback(supplier: string, query: string) {
  const q = encodeURIComponent(query);
  const sup = supplier.toLowerCase();
  if (sup.includes("digikey")) return `https://www.digikey.com/en/products/result?k=${q}`;
  if (sup.includes("mouser")) return `https://www.mouser.com/c/?q=${q}`;
  if (sup.includes("rs")) return `https://rs-online.com/search?searchTerm=${q}`;
  if (sup.includes("farnell") || sup.includes("newark")) return `https://www.farnell.com/w/search?st=${q}`;
  if (sup.includes("aliexpress")) return `https://www.aliexpress.com/w/wholesale-${q}.html`;
  if (sup.includes("amazon")) return `https://www.amazon.com/s?k=${q}`;
  return `https://duckduckgo.com/?q=${q}`;
}
async function checkUrl(url: string): Promise<Extract<LinkStatus, "ok"|"broken">> {
  const target = canonicalize(url);
  if (!target) return "broken";
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    let r = await fetch(target, { method: "HEAD", redirect: "follow", signal: ctrl.signal });
    if (r.status >= 200 && r.status < 400) return "ok";
    r = await fetch(target, { method: "GET", redirect: "follow", signal: ctrl.signal });
    if (r.status >= 200 && r.status < 400) return "ok";
    return "broken";
  } catch {
    return "broken";
  } finally {
    clearTimeout(t);
  }
}

async function annotateLinks(items: BomItem[]): Promise<BomItem[]> {
  const limited = items.slice(0, 60);
  const results: BomItem[] = await Promise.all(
    limited.map(async (it): Promise<BomItem> => {
      const link = canonicalize(it.link);
      if (!link) {
        return {
          ...it,
          link: "",
          link_status: "missing",
          alt_link: supplierSearchFallback(it.supplier || "", `${it.suggested_product || it.part} ${it.spec || ""}`.trim()),
        };
      }
      const st = await checkUrl(link);
      if (st === "ok") {
        return { ...it, link, link_status: "ok" };
      }
      return {
        ...it,
        link,
        link_status: "broken",
        alt_link: supplierSearchFallback(it.supplier || "", `${it.suggested_product || it.part} ${it.spec || ""}`.trim()),
      };
    })
  );
  // dołącz ogon bez sprawdzania (jeśli >60) — to nadal BomItem
  return results.concat(items.slice(60));
}

// —— MAIN —— //
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
          suggested_product: "string",
          supplier: "string",
          link: "https://...",
          unit_price: 0
        }],
        disclaimer: "string"
      }),
      "Prefer reputable suppliers (Digi-Key, Mouser, RS Components, Farnell/Newark, Amazon, AliExpress).",
      "Use direct product pages (not search pages) where possible.",
      "Include realistic unit prices in the requested currency.",
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
        items: await annotateLinks(rawItems),
        disclaimer: asString(parsed.disclaimer, safe.disclaimer),
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
