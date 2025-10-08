import { request, gql } from "graphql-request";

const NEXAR_TOKEN_URL = "https://identity.nexar.com/connect/token";
const NEXAR_GRAPHQL = "https://api.nexar.com/graphql";

const PREFERRED = [
  "Digi-Key", "Mouser", "RS", "Farnell", "Newark",
  "Texas Instruments", "STMicroelectronics", "Microchip",
  "Arrow", "Avnet", "Future Electronics",
];

type Offer = {
  company: { name: string; homepageUrl?: string | null };
  sku?: string | null;
  clickUrl?: string | null;
  inventoryLevel?: number | null;
  prices?: Array<{ currency: string; price: number }>;
};

type PartNode = {
  mpn: string;
  manufacturer?: { name: string } | null;
  bestOffers?: { edges: Array<{ node: Offer }> } | null;
};

let cachedToken: { value: string; exp: number } | null = null;

async function fetchToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.exp - 30_000) return cachedToken.value;

  const body = new URLSearchParams();
  body.set("grant_type", "client_credentials");
  body.set("client_id", process.env.NEXAR_CLIENT_ID!);
  body.set("client_secret", process.env.NEXAR_CLIENT_SECRET!);
  body.set("scope", process.env.NEXAR_SCOPE || "marketplace.catalog.read");

  const r = await fetch(NEXAR_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!r.ok) throw new Error(`Nexar token error: ${r.status}`);
  const j = await r.json() as { access_token: string; expires_in: number };
  cachedToken = { value: j.access_token, exp: Date.now() + (j.expires_in * 1000) };
  return cachedToken.value;
}

const PART_SEARCH = gql`
  query PartSearch($q: String!, $limit: Int!) {
    supSearch(q: $q, limit: $limit) {
      results {
        part {
          mpn
          manufacturer { name }
          bestOffers(first: 20) {
            edges {
              node {
                company { name homepageUrl }
                sku
                clickUrl
                inventoryLevel
                prices { currency price }
              }
            }
          }
        }
      }
    }
  }
`;

function pickBestOffer(nodes: Offer[], wantedCurrency?: string) {
  // 1) preferowani dystrybutorzy
  const byPref = [...nodes].sort((a, b) => {
    const ia = PREFERRED.findIndex(p => (a.company?.name || "").includes(p));
    const ib = PREFERRED.findIndex(p => (b.company?.name || "").includes(p));
    return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
  });
  // 2) dopasowanie waluty
  const preferCurrency = wantedCurrency?.toUpperCase();
  const score = (o: Offer) => {
    const inv = o.inventoryLevel || 0;
    const hasClick = o.clickUrl ? 1 : 0;
    const hasPrice = (o.prices || []).length ? 1 : 0;
    const currencyHit = (o.prices || []).some(p => p.currency?.toUpperCase() === preferCurrency) ? 1 : 0;
    return (currencyHit * 100) + (hasPrice * 10) + (hasClick * 5) + Math.min(inv, 100)/100;
  };
  byPref.sort((a, b) => score(b) - score(a));
  return byPref[0] || null;
}

export async function resolveWithOctopart(mpnsOrNames: string[], wantedCurrency?: string) {
  // zwracamy mapę: klucz = input (mpn/name), wartość = { link, supplier, price?, mpn? }
  const out = new Map<string, { link?: string; supplier?: string; unit_price?: number; mpn?: string }>();
  if (!process.env.NEXAR_CLIENT_ID || !process.env.NEXAR_CLIENT_SECRET) return out;

  const token = await fetchToken();
  const headers = { authorization: `Bearer ${token}` };

  for (const q of mpnsOrNames) {
    try {
      const data = await request<{ supSearch: { results: Array<{ part: PartNode }> } }>(
        NEXAR_GRAPHQL,
        PART_SEARCH,
        { q, limit: 3 },
        headers
      );
      const parts = data?.supSearch?.results?.map(r => r.part).filter(Boolean) || [];
      if (!parts.length) { out.set(q, {}); continue; }

      // bierz pierwszy sensowny part
      const part = parts[0]!;
      const offers = part.bestOffers?.edges?.map(e => e.node).filter(Boolean) || [];
      const best = pickBestOffer(offers, wantedCurrency);

      if (best?.clickUrl) {
        // wybierz cenę w preferowanej walucie, albo najniższą
        let price: number | undefined = undefined;
        if (best.prices?.length) {
          const pref = best.prices.find(p => p.currency?.toUpperCase() === (wantedCurrency || "").toUpperCase());
          price = (pref || best.prices[0]).price;
        }
        out.set(q, {
          link: best.clickUrl,
          supplier: best.company?.name || "",
          unit_price: price,
          mpn: part.mpn,
        });
      } else {
        out.set(q, { mpn: part.mpn });
      }
    } catch {
      out.set(q, {});
    }
  }
  return out;
}
