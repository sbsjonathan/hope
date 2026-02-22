export default {
  async fetch(request) {
    const url = new URL(request.url);

    // Se você quiser fixo, deixa assim:
    const targetUrl =
      url.searchParams.get("url") ||
      "https://www.jw.org/pt/biblioteca/revistas/sentinela-estudo-janeiro-2026/Continue-cuidando-da-sua-necessidade-espiritual/";

    // Validação simples (evita usar o worker pra qualquer domínio)
    if (!/^https:\/\/www\.jw\.org\//i.test(targetUrl)) {
      return new Response("Use ?url=https://www.jw.org/...", {
        status: 400,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    try {
      const resp = await fetch(targetUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
          "Accept":
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
          "Cache-Control": "no-cache",
          "Pragma": "no-cache",
          "Upgrade-Insecure-Requests": "1",
        },
      });

      const html = await resp.text();

      // Retorna o HTML como veio
      return new Response(html, {
        status: resp.status,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Access-Control-Allow-Origin": "*",
          // opcional: permite usar no iPhone/HTML local sem treta
          "Access-Control-Allow-Methods": "GET, OPTIONS",
        },
      });
    } catch (e) {
      return new Response("Erro ao buscar o HTML.", {
        status: 500,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }
  },
};