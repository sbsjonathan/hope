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

    // === PASSO 1: ENGANAR O SISTEMA DE SEGURANÇA ===
    // Headers idênticos a um navegador real para evitar bloqueio 403
    const myHeaders = new Headers();
    myHeaders.append("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
    myHeaders.append("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8");
    myHeaders.append("Accept-Language", "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7");
    myHeaders.append("Referer", "https://www.google.com/"); // Fingir que viemos do Google

    try {
      const upstream = await fetch(target, {
        headers: myHeaders,
        redirect: "follow"
      });

      if (!upstream.ok) {
        return new Response(`Erro ao acessar site original: ${upstream.status}`, { status: upstream.status, headers: CORS_HEADERS });
      }

      const body = await upstream.text();
      let extractedHtml = "";

      // === PASSO 2: O CORTE BRUTO (A Lógica do Lixo) ===
      // A tag <main> é o padrão HTML5 para "conteúdo principal". O JW usa ela.
      // Tudo antes dela é cabeçalho (lixo), tudo depois é rodapé (lixo).
      
      const mainMatch = body.match(/<main[\s\S]*?<\/main>/i);
      
      if (mainMatch) {
        extractedHtml = mainMatch[0];
      } else {
        // Fallback: Se não tiver <main>, tenta pegar o <div id="article"> (páginas muito antigas)
        const articleMatch = body.match(/<div[^>]*id="article"[\s\S]*?<!--\s*#article\s*-->/i);
        if (articleMatch) {
            extractedHtml = articleMatch[0];
        } else {
            // Última tentativa: pega do body, mas vai vir sujo (o CSS vai ter que limpar)
             const bodyMatch = body.match(/<body[\s\S]*?<\/body>/i);
             extractedHtml = bodyMatch ? bodyMatch[0] : "<h1>Erro: Não foi possível extrair o conteúdo.</h1>";
        }
      }

      // === PASSO 3: LIMPEZA DE ENDEREÇOS ===
      // Converte links relativos (/imagem.jpg) em absolutos (https://jw.org/imagem.jpg)
      const targetUrl = new URL(target);
      const base = targetUrl.origin;
      extractedHtml = extractedHtml.replace(/(href|src)="(?!https?:\/\/|\/\/|data:)([^"]*?)"/gi,
        (_, attr, path) => {
          const abs = path.startsWith("/") ? base + path : base + "/" + path;
          return `${attr}="${abs}"`;
        }
      );

      // Remove scripts para segurança
      extractedHtml = extractedHtml.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");

      return new Response(extractedHtml, {
        status: 200,
        headers: {
          ...CORS_HEADERS,
          "Content-Type": "text/html; charset=utf-8"
        },
      });

    } catch (err) {
      return new Response(`Erro no Worker: ${err.message}`, { status: 500, headers: CORS_HEADERS });
    }
  },
};