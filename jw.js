export default {
  async fetch(request) {
    // Preflight CORS
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    const url = new URL(request.url);

    const targetUrl =
      url.searchParams.get("url") ||
      "https://www.jw.org/pt/biblioteca/revistas/sentinela-estudo-janeiro-2026/Continue-cuidando-da-sua-necessidade-espiritual/";

    if (!/^https:\/\/www\.jw\.org\//i.test(targetUrl)) {
      return new Response("Use ?url=https://www.jw.org/...", {
        status: 400,
        headers: { ...corsHeaders(), "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    // Headers “browser-like”
    const H = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
      "Accept":
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
      "Cache-Control": "no-cache",
      "Pragma": "no-cache",
      "Upgrade-Insecure-Requests": "1",
      "Referer": "https://www.jw.org/",
    };

    // 3 tentativas (pra “pegar” quando o edge estiver de mau humor)
    let last = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const resp = await fetch(targetUrl, {
          redirect: "follow",
          headers: H,
          // Ajuda MUITO a estabilizar: menos hits repetidos no jw.org
          cf: { cacheTtl: 1800, cacheEverything: true },
        });

        last = resp;

        // Só aceitamos HTML bruto de verdade
        const ct = resp.headers.get("content-type") || "";
        const isHtml = /text\/html/i.test(ct);

        if (resp.ok && isHtml) {
          const html = await resp.text();
          return new Response(html, {
            status: 200,
            headers: {
              ...corsHeaders(),
              "Content-Type": "text/html; charset=utf-8",
              "X-Attempt": String(attempt),
            },
          });
        }
      } catch (e) {
        // guarda e tenta de novo
      }

      // pausa pequena antes de tentar de novo
      await sleep(250 * attempt);
    }

    // Se falhou, devolve erro CLARO (pra você não achar que “voltou nada”)
    const status = last ? last.status : 0;
    const ct = last ? (last.headers.get("content-type") || "") : "";
    let snippet = "";

    try {
      if (last) {
        const txt = await last.text();
        snippet = (txt || "").slice(0, 800);
      }
    } catch (e) {}

    return new Response(
      [
        "FALHOU AO BUSCAR HTML BRUTO DO JW.ORG",
        `status=${status}`,
        `content-type=${ct}`,
        "",
        "snippet (primeiros 800 chars):",
        snippet || "(sem corpo)",
      ].join("\n"),
      {
        status: 502,
        headers: { ...corsHeaders(), "Content-Type": "text/plain; charset=utf-8" },
      }
    );
  },
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}