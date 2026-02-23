export default {
  async fetch(request, env, ctx) {
    // Lidar com requisições de preflight (OPTIONS) do navegador
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    const targetUrl = "https://www.jw.org/pt/biblioteca/revistas/sentinela-estudo-janeiro-2026/Continue-cuidando-da-sua-necessidade-espiritual/";

    try {
      // Faz a requisição a partir dos servidores da Cloudflare (Back-end)
      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          // É uma boa prática identificar a sua requisição ou usar um User-Agent genérico
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html"
        }
      });

      if (!response.ok) {
        return new Response(`Erro ao buscar a página. Status: ${response.status}`, { status: response.status });
      }

      // Extrai o HTML bruto da resposta
      const html = await response.text();

      // Retorna o HTML para o seu cliente (navegador) com os cabeçalhos CORS liberados
      return new Response(html, {
        headers: {
          "Content-Type": "text/html;charset=UTF-8",
          "Access-Control-Allow-Origin": "*", // Em produção, substitua "*" pelo domínio do seu front-end
        },
      });
    } catch (error) {
      return new Response(`Erro interno no Worker: ${error.message}`, { status: 500 });
    }
  },
};