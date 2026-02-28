const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request) {
    // 1. Responde ao "pre-flight" do navegador
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const urlParams = new URL(request.url).searchParams;
    const targetUrl = urlParams.get("url");

    if (!targetUrl) return new Response("URL faltando", { status: 400, headers: CORS_HEADERS });

    try {
      // 2. Busca o site fingindo ser o Googlebot (Geralmente não é bloqueado)
      const response = await fetch(targetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
          "Accept": "text/html"
        }
      });

      let html = await response.text();
      let content = "";

      // 3. Lógica SIMPLES de extração
      // Tenta achar onde começa o conteúdo real
      let startString = "";
      let endString = "";

      // CASO 1: Revistas de Estudo (Link 2) geralmente usam "docSubContent"
      if (html.includes('class="docSubContent"')) {
        const startPos = html.indexOf('class="docSubContent"');
        // Retrocede para pegar a tag <div de abertura
        const realStart = html.lastIndexOf('<div', startPos);
        
        // Corta do início até o fim do arquivo (o CSS vai esconder o rodapé depois)
        // Isso é mais seguro do que tentar adivinhar onde fecha a div
        content = html.substring(realStart);
      } 
      // CASO 2: Artigos normais (Link 1) geralmente usam <article>
      else if (html.includes('<article')) {
         const startPos = html.indexOf('<article');
         content = html.substring(startPos);
      }
      // CASO 3: Fallback para o ID "article" (muito comum em posts antigos)
      else if (html.includes('id="article"')) {
         const startPos = html.indexOf('id="article"');
         const realStart = html.lastIndexOf('<div', startPos);
         content = html.substring(realStart);
      }
      else {
        // Se falhar tudo, pega o body (vai vir sujo, mas vem)
        const bodyStart = html.indexOf('<body');
        content = html.substring(bodyStart);
      }

      // 4. Limpa o HTML para links absolutos (Imagens funcionarem)
      const origin = new URL(targetUrl).origin;
      content = content.replace(/(href|src)="\/(?!\/)/g, `$1="${origin}/`);

      // 5. Remove scripts para evitar erros de execução
      content = content.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");

      return new Response(content, {
        headers: {
          ...CORS_HEADERS,
          "Content-Type": "text/html; charset=utf-8"
        }
      });

    } catch (e) {
      return new Response("Erro no Worker: " + e.message, { status: 500, headers: CORS_HEADERS });
    }
  },
};