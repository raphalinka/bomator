const FETCH_TIMEOUT_MS = 7000;

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

// Heurystyki: jak wyglądają karty produktu (nie listing)
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
        !/^(pcs?|piece|unit|pack|the|and|or|for|with)$/i.test(t)
    );

  if (!tokens.length) return null;

  // Scoring bez "any": preferuj tokeny zawierające cyfry + dłuższe
  const score = (t: string): number => {
    const hasDigit = /\d/.test(t) ? 1 : 0;
    return hasDigit * 1000 + t.length; // waga cyfr > długość
  };

  tokens.sort((a, b) => score(b) - score(a));
  return tokens[0] || null;
}

function normalizeUrl(url: string): string {
  let s = url.trim();
  if (!s) return "";
  if (!/^https?:\/\//i.test(s)) s = "https://" + s;
  try {
    const u = new URL(s);
    u.hash = "";
    return u.toString();
  } catch {
    return s;
  }
}

// Akceptujemy 2 przypadki:
// 1) realny 2xx/3xx z serwera
// 2) 403/503 ale URL pasuje do wzorca karty produktu (prawdopodobna blokada botów)
async function headOkOrLooksLikeProduct(url: string): Promise<boolean> {
  const norm = normalizeUrl(url);
  const host = Object.keys(productDetailPatterns).find((d) => norm.includes(d));
  const looksLikeProduct = host ? productDetailPatterns[host].test(norm) : false;

  const { ctrl, clear } = timeoutCtrl(FETCH_TIMEOUT_MS);
  try {
    let r = await fetch(norm, {
      method: "HEAD",
      redirect: "follow",
      signal: ctrl.signal,
      headers: {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "accept-language": "en-US,en;q=0.9",
      },
    });
    if (r.status >= 200 && r.status < 400) return true;
    r = await fetch(norm, {
      method: "GET",
      redirect: "follow",
      signal: ctrl.signal,
      headers: {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "accept-language": "en-US,en;q=0.9",
      },
    });
    if (r.status >= 200 && r.status < 400) return true;
    if ((r.status === 403 || r.status === 503) && looksLikeProduct) return true;
    return false;
  } catch {
    return looksLikeProduct;
  } finally {
    clear();
  }
}

function extractFirstLinkFromDuck(html: string): string | null {
  const re = /<a[^>]+class="result__a"[^>]+href="([^"]+)"/i;
  const m = re.exec(html);
  if (m && m[1]) return m[1];
  const re2 = /<a[^>]+href="(https?:\/\/[^"]+)"/i;
  const m2 = re2.exec(html);
  return m2 && m2[1] ? m2[1] : null;
}

async function ddgSearch(query: string, domain: string): Promise<string | null> {
  const q = encodeURIComponent(`site:${domain} ${query}`);
  const url = `https://duckduckgo.com/html/?q=${q}`;
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
  const mpn = mpnHint || extractMpn(titleOrProduct) || "";
  const queries = Array.from(new Set([mpn ? `${mpn}` : "", titleOrProduct].filter(Boolean)));

  for (const d of domains) {
    for (const q of queries) {
      const candidate = await ddgSearch(q, d);
      if (candidate && (await headOkOrLooksLikeProduct(candidate))) return candidate;
    }
  }
  return null;
}
