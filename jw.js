export default {
  async fetch(request, env, ctx) {
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,HEAD,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    };

    // Preflight (alguns Safaris/ambientes fazem OPTIONS mesmo em GET simples)
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    try {
      const u = new URL(request.url);
      let target = u.searchParams.get("url");
      if (!target) {
        return new Response("Missing ?url=", { status: 400, headers: cors });
      }

      // Normaliza jw.org -> www.jw.org (evita redirect/variações)
      target = target.replace(/^https?:\/\/jw\.org\//i, "https://www.jw.org/");
      target = target.replace(/^https?:\/\/www\.jw\.org\//i, "https://www.jw.org/");

      const upstream = await fetch(target, {
        redirect: "follow",
        headers: {
          "User-Agent": "Mozilla/5.0",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.7",
        },
      });

      const ct = upstream.headers.get("content-type") || "text/html; charset=utf-8";
      const html = await upstream.text();

      return new Response(html, {
        status: upstream.status,
        headers: { ...cors, "Content-Type": ct },
      });
    } catch (err) {
      return new Response("Worker error: " + (err?.message || String(err)), {
        status: 500,
        headers: cors,
      });
    }
  },
};