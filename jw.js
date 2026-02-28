const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

    const params = new URL(request.url).searchParams;
    const target = params.get("url");
    if (!target) return new Response("URL ausente.", { status: 400, headers: CORS_HEADERS });

    try {
      const upstream = await fetch(target, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)", // Fingimos ser o Google para pegar HTML limpo
          "Accept": "text/html",
        },
      });

      let body = await upstream.text();
      let extractedHtml = "";

      // === ESTRATÉGIA UNIVERSAL ===
      // O JW usa a classe 'docSubContent' para quase todo texto real.
      // Se não achar, tenta 'main', se não, 'article'.
      const markers = [
        'class="docSubContent"',
        'id="article"',
        '<main',
        '<article'
      ];

      let startIdx = -1;
      
      // Procura o primeiro marcador que aparecer no código
      for (let marker of markers) {
        startIdx = body.indexOf(marker);
        if (startIdx !== -1) {
          // Ajuste fino: Se achou a classe, volta um pouco para pegar a tag de abertura <div
          if (marker.includes('class') || marker.includes('id')) {
            startIdx = body.lastIndexOf('<div', startIdx);
          }
          break;
        }
      }

      if (startIdx !== -1) {
        // Agora procura onde o site termina (rodapé ou scripts finais)
        const endMarkers = ['<div id="docFooter"', '<footer', '<div class="groupFoot"'];
        let endIdx = -1;

        for (let marker of endMarkers) {
          endIdx = body.indexOf(marker, startIdx);
          if (endIdx !== -1) break;
        }

        // Se não achou rodapé, pega um pedaço grande por segurança
        if (endIdx === -1) endIdx = body.length;

        extractedHtml = body.substring(startIdx, endIdx);
      } else {
        extractedHtml = "<h3 style='padding:20px'>Não foi possível identificar o texto principal.</h3>";
      }

      // === LIMPEZA DE ENDEREÇOS ===
      const targetUrl = new URL(target);
      const base = targetUrl.origin;
      extractedHtml = extractedHtml.replace(/(href|src)="(?!https?:\/\/|\/\/|data:)([^"]*?)"/gi,
        (_, attr, path) => {
          const abs = path.startsWith("/") ? base + path : base + "/" + path;
          return `${attr}="${abs}"`;
        }
      );

      // Remove scripts maliciosos ou de tracking
      extractedHtml = extractedHtml.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");

      return new Response(extractedHtml, {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "text/html; charset=utf-8" },
      });

    } catch (err) {
      return new Response("Erro no servidor worker.", { status: 500, headers: CORS_HEADERS });
    }
  },
};