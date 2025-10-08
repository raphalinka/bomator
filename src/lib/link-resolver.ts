const FETCH_TIMEOUT_MS = 8000;

export type SupplierDomain =
  | "digikey.com"
  | "mouser.com"
  | "rs-online.com"
  | "farnell.com"
  | "newark.com"
  | "ti.com"
  | "st.com"
  | "microchip.com"
  | "aliexpress.com"
  | "amazon.com";

export function preferredDomains(supplier: string): SupplierDomain[] {
  const s = supplier.toLowerCase();
  if (s.includes("digikey")) return ["digikey.com"];
  if (s.includes("mouser")) return ["mouser.com"];
  if (s.includes("rs")) return ["rs-online.com"];
  if (s.includes("farnell")) return ["farnell.com"];
  if (s.includes("newark")) return ["newark.com"];
  if (s.includes("texas instruments") || s === "ti") return ["ti.com"];
  if (s.includes("stmicro") || s === "st") return ["st.com"];
  if (s.includes("microchip")) return ["microchip.com"];
  if (s.includes("aliexpress")) return ["aliexpress.com"];
  if (s.includes("amazon")) return ["amazon.com"];
  return ["digikey.com", "mouser.com", "rs-online.com", "farnell.com", "newark.com"];
}

// Jak wyglądają karty produktu (nie listingi)
const productDetailPatterns: Record<string, RegExp> = {
  "digikey.com": /https?:\/\/(?:www\.)?digikey\.com\/en\/products\/detail\/[^/]+\/[^/?#]+/i,
  "mouser.com": /https?:\/\/(?:www\.)?mouser\.com\/ProductDetail\/[^/?#]+/i,
  "rs-online.com": /https?:\/\/(?:.*\.)?rs-online\.com\/[^?#]*\/p\/[^/?#]+/i,
  "farnell.com": /https?:\/\/(?:.*\.)?farnell\.com\/[^?#]*\/p\/[^/?#]+/i,
  "newark.com": /https?:\/\/(?:.*\.)?newark\.com\/[^?#]*\/p\/[^/?#]+/i,
  "ti.com": /https?:\/\/(?:www\.)?ti\.com\/product\/[^/?#]+/i,
  "st.com": /https?:\/\/(?:www\.)?st\.com\/en\/[^/?#]+\/[^/?#]+\.html/i,
  "microchip.com": /https?:\/\/(?:www\.)?microchip\.com\/en-us\/product\/[^/?#]+/i,
  "aliexpress.com": /https?:\/\/(?:www\.)?aliexpress\.com\/item\/[^/?#]+\.html/i,
  "amazon.com": /https?:\/\/(?:www\.)?amazon\.com\/[^/?#]+\/dp\/[A-Z0-9]{10}/i,
};

// słowa-klucze per domena, żeby zmusić wyszukiwarkę do kart produktu
const domainHints: Record<string, string[]> = {
  "digikey.com": ["\"/en/products/detail\"", "site:digikey.com/en/products/detail"],
  "mouser.com":  ["ProductDetail", "\"/ProductDetail/\""],
  "rs-online.com": ["\"/p/\"", "site:rs-online.com p"],
  "farnell.com": ["\"/p/\"", "site:farnell.com p"],
  "newark.com": ["\"/p/\"", "site:newark.com p"],
  "ti.com": ["product"],
  "st.com": ["site:st.com/en", "datasheet"],
  "microchip.com": ["site:microchip.com/en-us/product"],
  "aliexpress.com": ["site:aliexpress.com/item"],
  "amazon.com": ["site:amazon.com dp"],
};

function timeoutCtrl(ms: number) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return { ctrl, clear: () => clearTimeout(t) };
}

export function extractMpn(text: string): string | null {
  if (!text) return null;
  const tokens = text
    .split(/[\s,;:()|]+/)
    .map((t) => t.trim())
    .filter(
      (t) =>
        /^[A-Za-z0-9][A-Za-z0-9\-_.]{2,}$/.test(t) &&
        !/^(pcs?|piece|unit|pack|the|and|or|for|with|module|board|kit)$/i.test(t)
    );
  if (!tokens.length) return null;
  const score = (t: string): number => (/\d/.test(t) ? 1000 : 0) + t.length;
  tokens.sort((a, b) => score(b) - score(a));
  return tokens[0] || null;
}

function normalizeUrl(url: string): string {
  let s = url.trim();
  if (!s) return "";
  if (!/^https?:\/\//i.test(s)) s = "https://" + s;
  try { const u = new URL(s); u.hash = ""; return u.toString(); } catch { return s; }
}

async function allowIfProductLike(url: string): Promise<boolean> {
  const norm = normalizeUrl(url);
  const host = Object.keys(productDetailPatterns).find((d) => norm.includes(d));
  return host ? productDetailPatterns[host].test(norm) : false;
}

function extractFirstLinkFromDuck(html: string): string | null {
  // DuckDuckGo lite
  const re = /<a[^>]+class="result__a"[^>]+href="([^"]+)"/i;
  const m = re.exec(html);
  if (m && m[1]) return m[1];
  const re2 = /<a[^>]+href="(https?:\/\/[^"]+)"/i;
  const m2 = re2.exec(html);
  return m2 && m2[1] ? m2[1] : null;
}

async function ddgSearch(query: string): Promise<string | null> {
  const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const { ctrl, clear } = timeoutCtrl(FETCH_TIMEOUT_MS);
  try {
    const r = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: ctrl.signal,
      headers: { "user-agent": "Mozilla/5.0", "accept-language": "en-US,en;q=0.9" },
    });
    if (!r.ok) return null;
    const html = await r.text();
    const link = extractFirstLinkFromDuck(html);
    return link ? normalizeUrl(link) : null;
  } catch {
    return null;
  } finally {
    clear();
  }
}

export async function resolveBestProductUrl(
  supplier: string,
  titleOrProduct: string,
  mpnHint?: string
): Promise<string | null> {
  const domains = preferredDomains(supplier);
  const mpn = (mpnHint || extractMpn(titleOrProduct) || "").trim();
  const baseQueries = Array.from(new Set([mpn, titleOrProduct].filter(Boolean)));

  for (const d of domains) {
    const hints = domainHints[d] || [];
    const queries = [
      ...baseQueries.map((q) => `site:${d} ${q}`),
      ...hints.flatMap((h) => baseQueries.map((q) => `${h} ${q}`)),
    ];
    for (const q of queries) {
      const candidate = await ddgSearch(q);
      if (!candidate) continue;
      if (await allowIfProductLike(candidate)) return candidate;
    }
  }
  return null;
}

// ——— ekstra: zbuduj zawsze linki-wyszukiwarki dla UI (fallback dla człowieka) ———
export function buildSearchLinks(mpnOrName: string) {
  const q = encodeURIComponent(mpnOrName);
  return {
    digikey: `https://www.digikey.com/en/products/result?k=${q}`,
    mouser: `https://www.mouser.com/c/?q=${q}`,
    rs: `https://rs-online.com/search?searchTerm=${q}`,
    farnell: `https://www.farnell.com/w/search?st=${q}`,
    newark: `https://www.newark.com/search?st=${q}`,
    amazon: `https://www.amazon.com/s?k=${q}`,
    aliexpress: `https://www.aliexpress.com/w/wholesale-${q}.html`,
  };
}
