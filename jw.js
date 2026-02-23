export default {
  async fetch(request, env, ctx) {
    const targetUrl =
      "https://www.jw.org/pt/biblioteca/revistas/sentinela-estudo-janeiro-2026/Continue-cuidando-da-sua-necessidade-espiritual/";

    // 1. Cabeçalhos de CORS OBRIGATÓRIOS. Vão em todas as respostas (sucesso ou erro)
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // 2. Resolve o "Preflight" do navegador
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // ---- LIMPEZA (APENAS 5 e 6) ----
    const cleanHtml_5_6 = (html) => {
      let out = html;

      // (5) Remove blocos "Sua resposta" (gen-field com textarea)
      // Exemplo no HTML: <div class="gen-field" ...><label> Sua resposta</label><textarea ...></textarea></div>
      out = out.replace(
        /<div\b[^>]*class=(?:"|')[^"']*\bgen-field\b[^"']*(?:"|')[^>]*>[\s\S]*?<textarea\b[\s\S]*?<\/textarea>[\s\S]*?<\/div>/gi,
        ""
      );

      // (6) Remove player de áudio (pinned audio player)
      // Exemplo: <div class="noJShide jsPinnedAudioPlayer ..."> ... </div>
      out = out.replace(
        /<div\b[^>]*class=(?:"|')[^"']*\bjsPinnedAudioPlayer\b[^"']*(?:"|')[^>]*>[\s\S]*?<\/div>/gi,
        ""
      );

      // (6b) Remove também o player "normal" caso apareça como jsAudioPlayer
      out = out.replace(
        /<div\b[^>]*class=(?:"|')[^"']*\bjsAudioPlayer\b[^"']*(?:"|')[^>]*>[\s\S]*?<\/div>/gi,
        ""
      );

      // (opcional leve) evita buracos enormes no HTML
      out = out.replace(/\n{3,}/g, "\n\n");

      return out;
    };

    try {
      // 3. Cabeçalhos furtivos para enganar o WAF (Akamai) do JW.org
      const headers = new Headers({
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
        "Cache-Control": "max-age=0",
        "Sec-Ch-Ua":
          '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"Windows"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
      });

      // 4. Dispara a requisição. 'redirect: "follow"' garante que redirecionamentos de URL sejam seguidos
      const response = await fetch(targetUrl, {
        method: "GET",
        headers: headers,
        redirect: "follow",
      });

      const html = await response.text();

      // 5. Se o anti-bot ainda assim barrar, retornamos o erro PRO FRONT-END mas COM O CORS LIBERADO!
      // Assim você vai ver no `console.log` o porquê foi barrado.
      if (!response.ok) {
        return new Response(
          `Erro do site alvo: Status ${response.status}\n\nCódigo-fonte do erro:\n${html}`,
          {
            status: response.status,
            headers: {
              ...corsHeaders,
              "Content-Type": "text/plain;charset=UTF-8",
            },
          }
        );
      }

      const cleaned = cleanHtml_5_6(html);

      // 6. Sucesso! Retorna o HTML com CORS
      return new Response(cleaned, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "text/html;charset=UTF-8",
        },
      });
    } catch (error) {
      // 7. Erro interno da nuvem, também retorna o erro com CORS
      return new Response(`Erro na infraestrutura do Worker: ${error.message}`, {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "text/plain;charset=UTF-8",
        },
      });
    }
  },
};