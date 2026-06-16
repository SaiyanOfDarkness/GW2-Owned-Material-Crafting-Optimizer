export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const SECRET = process.env.SECRET;

  if (!SECRET || req.query.secret !== SECRET) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const accessToken = req.query.access_token;

  if (!accessToken) {
    return res.status(400).json({ error: "Missing access_token" });
  }

  const endpoints = {
    materials: "/v2/account/materials",
    bank: "/v2/account/bank",
    wallet: "/v2/account/wallet"
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
    const [materials, bank, wallet] = await Promise.all([
      fetchGw2(endpoints.materials),
      fetchGw2(endpoints.bank),
      fetchGw2(endpoints.wallet)
    ]);

    return res.status(200).json({
      fetched_at: new Date().toISOString(),
      cache_seconds: 0,
      materials,
      bank,
      wallet
    });
  } catch (error) {
    return res.status(500).json({
      error: "Account data fetch failed",
      detail: error.message
    });
  }
}
