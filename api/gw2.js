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

  const endpoint = req.query.endpoint || "/v2/build";

  if (!endpoint.startsWith("/v2/")) {
    return res.status(400).json({ error: "Invalid GW2 endpoint" });
  }

  const gw2Url = new URL(`https://api.guildwars2.com${endpoint}`);

  for (const [key, value] of Object.entries(req.query)) {
    if (key !== "secret" && key !== "endpoint") {
      gw2Url.searchParams.set(key, value);
    }
  }

  try {
    const response = await fetch(gw2Url.toString(), {
      headers: {
        "User-Agent": "GW2-Owned-Material-Crafting-Optimizer/1.0"
      }
    });

    const text = await response.text();

    res.status(response.status);
    res.setHeader("Content-Type", response.headers.get("content-type") || "application/json");
    return res.send(text);
  } catch (error) {
    return res.status(500).json({
      error: "Proxy request failed",
      detail: error.message
    });
  }
}
