const publicCache = new Map();

const allowedOrigins = new Set([
  "https://saiyanofdarkness.github.io",
  "https://gw-2-owned-material-crafting-optimi.vercel.app"
]);

const STABLE_CACHE_MS = 14 * 24 * 60 * 60 * 1000; // 14 days
const COMMERCE_CACHE_MS = 2 * 60 * 1000; // 2 minutes
const BUILD_CACHE_MS = 10 * 60 * 1000; // 10 minutes

function getCacheDuration(endpoint) {
  if (endpoint === "/v2/build") return BUILD_CACHE_MS;

  if (
    endpoint.startsWith("/v2/commerce/prices") ||
    endpoint.startsWith("/v2/commerce/listings") ||
    endpoint.startsWith("/v2/commerce/exchange")
  ) {
    return COMMERCE_CACHE_MS;
  }

  if (
    endpoint.startsWith("/v2/items") ||
    endpoint.startsWith("/v2/recipes") ||
    endpoint.startsWith("/v2/materials")
  ) {
    return STABLE_CACHE_MS;
  }

  return 0;
}

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

  const endpoint = req.query.endpoint || "/v2/build";

  if (!endpoint.startsWith("/v2/")) {
    return res.status(400).json({ error: "Invalid GW2 endpoint" });
  }

  const gw2Url = new URL(`https://api.guildwars2.com${endpoint}`);

  for (const [key, value] of Object.entries(req.query)) {
    if (key !== "endpoint") {
      gw2Url.searchParams.set(key, value);
    }
  }

  const cacheDuration = getCacheDuration(endpoint);
  const cacheKey = gw2Url.toString();
  const now = Date.now();

  if (cacheDuration > 0) {
    const cached = publicCache.get(cacheKey);

    if (cached && now - cached.time < cacheDuration) {
      res.status(cached.status);
      res.setHeader("Content-Type", cached.contentType);
      res.setHeader("X-GW2-Proxy-Cache", "HIT");
      res.setHeader("X-GW2-Proxy-Cache-Age", String(Math.floor((now - cached.time) / 1000)));
      return res.send(cached.body);
    }
  }

  try {
    const response = await fetch(gw2Url.toString(), {
      headers: {
        "User-Agent": "GW2-Owned-Material-Crafting-Optimizer/1.0"
      }
    });

    const text = await response.text();
    const contentType = response.headers.get("content-type") || "application/json";

    if (cacheDuration > 0 && response.ok) {
      publicCache.set(cacheKey, {
        time: now,
        status: response.status,
        contentType,
        body: text
      });
    }

    res.status(response.status);
    res.setHeader("Content-Type", contentType);
    res.setHeader("X-GW2-Proxy-Cache", cacheDuration > 0 ? "MISS" : "BYPASS");
    res.setHeader("X-GW2-Proxy-Cache-Age", "0");
    return res.send(text);
  } catch (error) {
    return res.status(500).json({
      error: "Proxy request failed",
      detail: error.message
    });
  }
}
