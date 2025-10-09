const FETCH_TIMEOUT_MS = 5000;

function timeoutCtrl(ms: number) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return { ctrl, clear: () => clearTimeout(t) };
}

function extractNumberLike(s: string): number | null {
  // wyciąga 12.34 lub 12,34 → 12.34
  const m = s.match(/(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})/);
  if (!m) return null;
  const v = m[1].replace(/\./g, "").replace(",", ".");
  const n = Number(v);
  return isFinite(n) ? n : null;
}

export async function tryFetchUnitPrice(url: string, currencyHint?: string): Promise<number | null> {
  const { ctrl, clear } = timeoutCtrl(FETCH_TIMEOUT_MS);
  try {
    const r = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: ctrl.signal,
      headers: { "user-agent": "Mozilla/5.0", "accept-language": "en-US,en;q=0.9" },
      cache: "no-store"
    });
    if (!r.ok) return null;
    const html = await r.text();

    // Mouser: meta itemprop="price" content="0.59"
    if (/mouser\.com/i.test(url)) {
      const m = html.match(/itemprop="price"\s+content="([\d.,]+)"/i) || html.match(/"unitPrice"\s*:\s*"([\d.,]+)"/i);
      if (m) return extractNumberLike(m[1]);
    }

    // Digi-Key: data-testid="pricing" lub "price": "0.42"
    if (/digikey\.com/i.test(url)) {
      const m = html.match(/"price"\s*:\s*"([\d.,]+)"/i) || html.match(/data-testid="pricing"[^>]*>\s*([^<]+)/i);
      if (m) return extractNumberLike(m[1]);
    }

    // RS: "unitPrice": "1.23" lub £/$ w tekście
    if (/rs-online\.com/i.test(url)) {
      const m = html.match(/"unitPrice"\s*:\s*"([\d.,]+)"/i) || html.match(/(?:£|\$|€)\s*\d+[.,]\d{2}/);
      if (m) return extractNumberLike(m[1]);
    }

    // Farnell/Newark (element14): "price": "0.13"
    if (/farnell\.com|newark\.com/i.test(url)) {
      const m = html.match(/"price"\s*:\s*"([\d.,]+)"/i) || html.match(/(?:£|\$|€)\s*\d+[.,]\d{2}/);
      if (m) return extractNumberLike(m[1]);
    }

    // Arrow jako bonus:
    if (/arrow\.com/i.test(url)) {
      const m = html.match(/"price"\s*:\s*"([\d.,]+)"/i) || html.match(/(?:£|\$|€)\s*\d+[.,]\d{2}/);
      if (m) return extractNumberLike(m[1]);
    }

    return null;
  } catch {
    return null;
  } finally { clear(); }
}
