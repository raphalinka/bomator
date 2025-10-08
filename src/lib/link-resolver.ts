const FETCH_TIMEOUT_MS = 6000;

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
  // domyślna kolejność znanych dystrybutorów
  return ["digikey.com", "mouser.com", "rs-online.com", "farnell.com", "newark.com"];
}

function timeoutCtrl(ms: number) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return { ctrl, clear: () => clearTimeout(t) };
}

export async function headOk(url: string): Promise<boolean> {
  const { ctrl, clear } = timeoutCtrl(FETCH_TIMEOUT_MS);
  try {
    let r = await fetch(url, { method: "HEAD", redirect: "follow", signal: ctrl.signal });
    if (r.ok || (r.status >= 200 && r.status < 400)) return true;
    // fallback GET (część serwisów nie wspiera HEAD)
    r = await fetch(url, { method: "GET", redirect: "follow", signal: ctrl.signal });
    return r.ok || (r.status >= 200 && r.status < 400);
  } catch {
    return false;
  } finally { clear(); }
}

function extractFirstLinkFromDuck(html: string): string | null {
  // DuckDuckGo HTML (/html/) zwraca linki w <a rel="nofollow" class="result__a" href="…">
  const re = /<a[^>]+class="result__a"[^>]+href="([^"]+)"/i;
  const m = re.exec(html);
  if (m && m[1]) return m[1];
  // fallback prosty
  const re2 = /<a[^>]+href="(https?:\/\/[^"]+)"/i;
  const m2 = re2.exec(html);
  return m2 && m2[1] ? m2[1] : null;
}

export async function searchDistributorPage(query: string, domain: string): Promise<string | null> {
  // używamy wersji HTML (bez JS), żeby serwerless mógł sparsować
  const q = encodeURIComponent(`site:${domain} ${query}`);
  const url = `https://duckduckgo.com/html/?q=${q}`;
  const { ctrl, clear } = timeoutCtrl(FETCH_TIMEOUT_MS);
  try {
    const r = await fetch(url, { method: "GET", redirect: "follow", signal: ctrl.signal, headers: { "user-agent": "Mozilla/5.0" } });
    if (!r.ok) return null;
    const html = await r.text();
    const link = extractFirstLinkFromDuck(html);
    return link ?? null;
  } catch {
    return null;
  } finally { clear(); }
}

export async function resolveBestProductUrl(
  supplier: string,
  partName: string,
  mpnLike?: string
): Promise<string | null> {
  const domains = preferredDomains(supplier);
  const queries = [
    [mpnLike, partName].filter(Boolean).join(" "),
    partName,
  ];

  for (const d of domains) {
    for (const q of queries) {
      if (!q) continue;
      const candidate = await searchDistributorPage(q, d);
      if (candidate && await headOk(candidate)) return candidate;
    }
  }
  return null;
}
