export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    const SECRET = env.SECRET;

    if (url.searchParams.get("secret") !== SECRET) {
      return new Response("Forbidden", { status: 403 });
    }

    if (!url.pathname.startsWith("/gw2/")) {
      return new Response("Only /gw2/ paths allowed", { status: 403 });
    }

    const gw2Path = url.pathname.replace(/^\/gw2/, "");
    const gw2Url = new URL("https://api.guildwars2.com" + gw2Path);

    for (const [key, value] of url.searchParams.entries()) {
      if (key !== "secret") {
        gw2Url.searchParams.set(key, value);
      }
    }

    const response = await fetch(gw2Url.toString());

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Content-Type": response.headers.get("Content-Type") || "application/json"
      }
    });
  }
};
