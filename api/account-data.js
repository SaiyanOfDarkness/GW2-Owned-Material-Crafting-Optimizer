const cache = new Map();

const CACHE_DURATION = 5 * 60 * 1000;

const allowedOrigins = new Set([
  "https://saiyanofdarkness.github.io",
  "https://gw-2-owned-material-crafting-optimi.vercel.app"
]);

export default async function handler(req, res) {
  const origin = req.headers.origin || "";
  const referer = req.headers.referer || "";

  const corsOrigin = allowedOrigins.has(origin)
    ? origin
    : "https://saiyanofdarkness.github.io";

  res.setHeader("Access-Control-Allow-Origin", corsOrigin);
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const refererAllowed = [...allowedOrigins].some(site => referer.startsWith(site));

  if (origin && !allowedOrigins.has(origin)) {
    return res.status(403).json({ error: "Forbidden origin" });
  }

  if (!origin && referer && !refererAllowed) {
    return res.status(403).json({ error: "Forbidden referer" });
  }

  const accessToken = req.query.access_token;

  if (!accessToken) {
    return res.status(400).json({ error: "Missing access_token" });
  }

  const now = Date.now();
  const cacheKey = accessToken.slice(-16);
  const cachedEntry = cache.get(cacheKey);

  if (cachedEntry && (now - cachedEntry.time) < CACHE_DURATION) {
    return res.status(200).json({
      ...cachedEntry.data,
      cache_seconds: Math.floor((now - cachedEntry.time) / 1000),
      cached: true
    });
  }

  const endpoints = {
    materials: "/v2/account/materials",
    bank: "/v2/account/bank",
    wallet: "/v2/account/wallet",
    characters: "/v2/characters?ids=all"
  };

  async function fetchGw2(endpoint) {
    const url = new URL(`https://api.guildwars2.com${endpoint}`);
    url.searchParams.set("access_token", accessToken);

    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent": "GW2-Owned-Material-Crafting-Optimizer/1.0"
      }
    });

    const text = await response.text();

    if (!response.ok) {
      throw new Error(`${endpoint} failed: ${response.status} ${text}`);
    }

    return JSON.parse(text);
  }

  try {
    const [materials, bank, wallet, characters] = await Promise.all([
      fetchGw2(endpoints.materials),
      fetchGw2(endpoints.bank),
      fetchGw2(endpoints.wallet),
      fetchGw2(endpoints.characters)
    ]);

    const result = {
      fetched_at: new Date().toISOString(),
      cache_seconds: 0,
      cached: false,
      materials: materials.filter(item => item && item.count > 0),
      bank: bank.filter(Boolean),
      wallet,
      characters
    };

    cache.set(cacheKey, {
      time: Date.now(),
      data: result
    });

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: "Account data fetch failed",
      detail: error.message
    });
  }
}
