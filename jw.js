const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const params = new URL(request.url).searchParams;
    const target = params.get("url");

    if (!target) return new Response("URL ausente.", { status: 400, headers: CORS_HEADERS });

    let targetUrl;
    try { targetUrl = new URL(target); } 
    catch { return new Response("URL inválida.", { status: 400, headers: CORS_HEADERS }); }

    try {
      const upstream = await fetch(targetUrl.toString(), {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/110.0.0.0 Safari/537.36",
          "Accept": "text/html",
        },
      });

      let body = await upstream.text();
      let articleContent = "";

      // MÁGICA 1: Encontrar o início do texto (Pega tanto revistas normais quanto de estudo)
      let startIdx = body.indexOf('<article');
      if (startIdx === -1) startIdx = body.indexOf('<div id="article"');
      if (startIdx === -1) startIdx = body.indexOf('<div class="docSubContent"');

      if (startIdx !== -1) {
        // Encontrar onde o artigo termina (corta antes do rodapé do site)
        let endIdx = body.indexOf('<div id="docFooter"', startIdx);
        if (endIdx === -1) endIdx = body.indexOf('<footer', startIdx);
        if (endIdx === -1) endIdx = body.indexOf('</main>', startIdx);

        if (endIdx !== -1) {
          articleContent = body.substring(startIdx, endIdx);
          articleContent += "</div>"; // Fecha a tag por segurança
        } else {
          articleContent = body.substring(startIdx, startIdx + 15000); // Backup de segurança
        }
      } else {
        articleContent = "<h2 style='text-align:center; padding: 20px;'>Não foi possível localizar o texto. O link pode ser inválido.</h2>";
      }

      // MÁGICA 2: Ajustar imagens para caminhos absolutos
      const base = targetUrl.origin;
      articleContent = articleContent.replace(/(href|src)="(?!https?:\/\/|\/\/|data:)([^"]*?)"/gi,
        (_, attr, path) => {
          const abs = path.startsWith("/") ? base + path : base + "/" + path;
          return `${attr}="${abs}"`;
        }
      );

      // MÁGICA 3: Remover scripts para não carregar lixo
      articleContent = articleContent.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

      return new Response(articleContent, {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "text/html; charset=utf-8" },
      });

    } catch (err) {
      return new Response("Falha no servidor.", { status: 500, headers: CORS_HEADERS });
    }
  },
};