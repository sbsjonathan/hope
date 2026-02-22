export default {
  async fetch(request) {
    // Preflight CORS (iPhone/Safari às vezes dispara)
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(),
      });
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

    try {
      // 1) Tenta direto no jw.org
      const direct = await fetch(targetUrl, {
        redirect: "follow",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
          "Accept":
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
          "Cache-Control": "no-cache",
          "Pragma": "no-cache",
          "Upgrade-Insecure-Requests": "1",
          "Referer": "https://www.jw.org/",
        },
        // Dica pro edge cache do Cloudflare do worker (não é obrigatório)
        cf: { cacheTtl: 3600, cacheEverything: true },
      });

      // Se vier “normal”, devolve o HTML
      if (direct.ok && /text\/html/i.test(direct.headers.get("content-type") || "")) {
        const html = await direct.text();
        return new Response(html, {
          status: 200,
          headers: { ...corsHeaders(), "Content-Type": "text/html; charset=utf-8" },
        });
      }

      // 2) Se bloqueou (403/520/5xx) ou não veio html, faz fallback
      const status = direct.status;

      const fallbackUrl = "https://r.jina.ai/http://www.jw.org" + new URL(targetUrl).pathname;
      // Obs: r.jina.ai exige http:// na frente (mesmo que o site real seja https)
      // Ex: https://r.jina.ai/http://www.jw.org/pt/...

      const fb = await fetch(fallbackUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
          "Accept": "text/html,*/*;q=0.8",
          "Accept-Language": "pt-BR,pt;q=0.9",
          "Cache-Control": "no-cache",
          "Pragma": "no-cache",
        },
        redirect: "follow",
        cf: { cacheTtl: 3600, cacheEverything: true },
      });

      if (fb.ok) {
        const html = await fb.text();
        // r.jina.ai devolve o HTML “extraído” (quase sempre resolve quando jw.org bloqueia worker)
        return new Response(html, {
          status: 200,
          headers: {
            ...corsHeaders(),
            "Content-Type": "text/html; charset=utf-8",
            "X-Direct-Status": String(status), // só pra você ver que caiu no fallback
          },
        });
      }

      // Se até o fallback falhar:
      return new Response(
        `Falhou. Direto jw.org status=${status}. Fallback status=${fb.status}.`,
        {
          status: 502,
          headers: { ...corsHeaders(), "Content-Type": "text/plain; charset=utf-8" },
        }
      );
    } catch (e) {
      return new Response("Erro interno ao buscar HTML.", {
        status: 500,
        headers: { ...corsHeaders(), "Content-Type": "text/plain; charset=utf-8" },
      });
    }
  },
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}