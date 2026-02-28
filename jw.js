const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request) {
    // Lida com requisições OPTIONS (Pré-voo do navegador)
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const params = new URL(request.url).searchParams;
    const target = params.get("url");

    if (!target) {
      return new Response("Parâmetro ?url= ausente.", { status: 400, headers: CORS_HEADERS });
    }

    let targetUrl;
    try {
      targetUrl = new URL(target);
    } catch {
      return new Response("URL inválida.", { status: 400, headers: CORS_HEADERS });
    }

    try {
      // Baixa o site inteiro (A Cloudflare faz isso em milissegundos)
      const upstream = await fetch(targetUrl.toString(), {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,*/*",
          "Accept-Language": "pt-BR,pt;q=0.9",
        },
      });

      let body = await upstream.text();

      // MÁGICA 1: Extrair apenas o artigo (ignora menus, rodapés e css pesado)
      let articleContent = "";
      const articleRegex = /<article[^>]*>([\s\S]*?)<\/article>/i;
      const match = body.match(articleRegex);

      if (match) {
        articleContent = match[0];
      } else {
        // Fallback caso não ache a tag article
        articleContent = "<h2>Não foi possível extrair o texto automaticamente.</h2>";
      }

      // MÁGICA 2: Ajustar URLs de imagens e links para caminhos absolutos
      const base = targetUrl.origin;
      articleContent = articleContent.replace(/(href|src)="(?!https?:\/\/|\/\/|data:)([^"]*?)"/gi,
        (_, attr, path) => {
          const abs = path.startsWith("/") ? base + path : base + "/" + path;
          return `${attr}="${abs}"`;
        }
      );

      // MÁGICA 3: Remover tags <script> por segurança e limpeza
      articleContent = articleContent.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

      return new Response(articleContent, {
        status: 200,
        headers: {
          ...CORS_HEADERS,
          "Content-Type": "text/html; charset=utf-8"
        },
      });

    } catch (err) {
      return new Response("Falha na extração", { status: 500, headers: CORS_HEADERS });
    }
  },
};