export default async function handler(req, res) {
  // 1. Guard the endpoint with your secret
  if (req.query.secret !== "TopOnePercentOfTheTopOnePercent") {
    return res.status(403).send("Unauthorized");
  }

  // 2. Extract the endpoint path (e.g., /v2/build)
  const endpoint = req.query.endpoint || "/v2/build";
  const gw2Url = `https://api.guildwars2.com${endpoint}`;

  try {
    // 3. Fetch from ArenaNet using Vercel's AWS infrastructure
    const response = await fetch(gw2Url, {
      headers: { "User-Agent": "MyGW2VercelRelay/1.0" }
    });

    if (response.status === 429) {
      return res.status(429).send("ArenaNet throttled Vercel IP. Try again.");
    }

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
