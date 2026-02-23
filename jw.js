export default {
  async fetch(request, env, ctx) {
    // 1. URL alvo que você deseja extrair
    const targetUrl = "https://www.jw.org/pt/biblioteca/revistas/sentinela-estudo-janeiro-2026/Continue-cuidando-da-sua-necessidade-espiritual/";

    // 2. Lida com requisições OPTIONS (Preflight do CORS)
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*", // Mude para o seu domínio em produção
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    try {
      // 3. Faz a requisição ao site alvo "burlando" bloqueios básicos de bots
      const response = await fetch(targetUrl, {
        method: "GET",
        headers: {
          // O User-Agent simula um navegador real (Chrome no Windows)
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7"
        }
      });

      // 4. Verifica se a página retornou erro (como 404 ou 403)
      if (!response.ok) {
        return new Response(`Erro ao acessar o site alvo: Status ${response.status}`, { 
          status: response.status 
        });
      }

      // 5. Extrai o HTML bruto da resposta
      const html = await response.text();

      // 6. Retorna o HTML para o seu frontend, anexando os cabeçalhos de CORS que liberam a leitura
      return new Response(html, {
        status: 200,
        headers: {
          "Content-Type": "text/html;charset=UTF-8",
          "Access-Control-Allow-Origin": "*", // Permite que qualquer site leia (ajuste na produção)
        },
      });

    } catch (error) {
      // Retorna erro caso falhe a requisição (ex: site fora do ar)
      return new Response(`Erro interno no Worker: ${error.message}`, { 
        status: 500 
      });
    }
  },
};