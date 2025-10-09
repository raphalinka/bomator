const CSE_URL = "https://www.googleapis.com/customsearch/v1";

type CseItem = { link?: string; displayLink?: string; title?: string; snippet?: string; };
type CseResp = { items?: CseItem[] };

const FETCH_TIMEOUT_MS = 6000;

function timeoutCtrl(ms: number) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return { ctrl, clear: () => clearTimeout(t) };
}

function norm(u: string): string {
  let s = u.trim();
  if (!s) return "";
  if (!/^https?:\/\//i.test(s)) s = "https://" + s;
  try { const url = new URL(s); url.hash = ""; return url.toString(); } catch { return s; }
}

async function headOk(url: string): Promise<boolean> {
  const { ctrl, clear } = timeoutCtrl(FETCH_TIMEOUT_MS);
  try {
    let r = await fetch(url, { method: "HEAD", redirect: "follow", signal: ctrl.signal });
    if (r.status >= 200 && r.status < 400) return true;
    r = await fetch(url, { method: "GET", redirect: "follow", signal: ctrl.signal });
    return r.status >= 200 && r.status < 400;
  } catch { return false; } finally { clear(); }
}

const SITES = [
  "mouser.com",
  "digikey.com",
  "rs-online.com",
  "farnell.com",
  "newark.com",
];

export async function resolveWithCSE(query: string): Promise<string | null> {
  const key = process.env.GOOGLE_API_KEY;
  const cx = process.env.GOOGLE_CSE_ID;
  if (!key || !cx) return null;

  // próbujemy per domena, żeby wybrać najlepszą
  for (const site of SITES) {
    const params = new URLSearchParams({
      key, cx,
      q: query,
      num: "3",
      siteSearch: site,
      siteSearchFilter: "i",
      safe: "off",
    });
    const url = `${CSE_URL}?${params.toString()}`;
    const r = await fetch(url, { method: "GET", cache: "no-store" });
    if (!r.ok) continue;
    const j = await r.json() as CseResp;
    for (const it of (j.items || [])) {
      const link = it.link ? norm(it.link) : "";
      if (link && await headOk(link)) return link;
    }
  }

  // fallback: jedna zbiorcza kwerenda bez siteSearch
  const params = new URLSearchParams({ key, cx, q: query, num: "3", safe: "off" });
  const url = `${CSE_URL}?${params.toString()}`;
  const r = await fetch(url, { method: "GET", cache: "no-store" });
  if (!r.ok) return null;
  const j = await r.json() as CseResp;
  for (const it of (j.items || [])) {
    const link = it.link ? norm(it.link) : "";
    if (link && await headOk(link)) return link;
  }

  return null;
}
