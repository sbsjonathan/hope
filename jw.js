const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

    const urlParams = new URL(request.url).searchParams;
    const targetUrl = urlParams.get("url");

    if (!targetUrl) return new Response("URL faltando", { status: 400, headers: CORS_HEADERS });

    try {
      // Usa um User-Agent genérico de navegador, sem tentar fingir ser Googlebot
      const response = await fetch(targetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        }
      });

      if (!response.ok) {
        // Se o JW.org der erro, repassamos o erro para saber o que houve
        return new Response(`Erro no JW.org: ${response.status} ${response.statusText}`, { status: response.status, headers: CORS_HEADERS });
      }

      let html = await response.text();

      // === LIMPEZA BÁSICA ===
      
      // 1. Converte links relativos em absolutos (CSS, Imagens, Links)
      const origin = new URL(targetUrl).origin;
      html = html.replace(/(href|src|action)="\/(?!\/)/g, `$1="${origin}/`);

      // 2. Remove TODOS os scripts (<script>...</script>)
      // Isso impede que o player de áudio tente carregar ou que analíticos rodem
      html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");

      // 3. Remove CSS externo para não quebrar o seu modal
      html = html.replace(/<link[^>]+rel="stylesheet"[^>]*>/gi, "");
      
      // 4. Extrai apenas o conteúdo do BODY para injetar na div
      const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
      const cleanBody = bodyMatch ? bodyMatch[1] : html;

      return new Response(cleanBody, {
        headers: {
          ...CORS_HEADERS,
          "Content-Type": "text/html; charset=utf-8"
        }
      });

    } catch (e) {
      return new Response("Erro 500 no Worker: " + e.message, { status: 500, headers: CORS_HEADERS });
    }
  },
};