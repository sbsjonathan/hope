export default {
  async fetch(request, env, ctx) {
    const targetUrl =
      "https://www.jw.org/pt/biblioteca/revistas/sentinela-estudo-janeiro-2026/Continue-cuidando-da-sua-necessidade-espiritual/";

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // ---- LIMPEZA DO HTML (remove lixo de idiomas etc.) ----
    const cleanHtml = (html) => {
      let out = html;

      // 1) Remove hreflang alternates (idiomas) no <head>
      out = out.replace(
        /<link\b[^>]*\brel=(?:"|')alternate(?:"|')[^>]*>/gi,
        ""
      );

      // 2) Remove metas "alternate locale" (quando existirem)
      out = out.replace(
        /<meta\b[^>]*(?:property|name)=(?:"|')og:locale:alternate(?:"|')[^>]*>/gi,
        ""
      );

      // 3) Remove o bloco gigante "Gostaria de ler este artigo em ... [lista de idiomas] ..."
      // Estratégia: corta do "Gostaria..." até logo antes do cabeçalho/data do estudo (ex: "2-8 DE MARÇO DE 2026")
      // ou antes do primeiro H1/título caso a data não apareça.
      out = out.replace(
        /Gostaria\s+de\s+ler\s+este\s+artigo\s+em[\s\S]*?(?=(?:\b\d{1,2}\s*[-–]\s*\d{1,2}\s+DE\s+[A-ZÇÃÕÁÉÍÓÚ]+\s+DE\s+\d{4}\b|<h1\b|<main\b|<article\b))/i,
        ""
      );

      // 4) Também remove trechos comuns de UI de idioma quando aparecem como texto/overlay
      out = out.replace(
        /Mudar\s+o\s+idioma\s+do\s+site[\s\S]*?(?=(?:<main\b|<article\b|<h1\b))/i,
        ""
      );

      // 5) Normaliza excesso de linhas em branco (opcional, deixa mais “limpo”)
      out = out.replace(/\n{3,}/g, "\n\n");

      return out;
    };

    try {
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

      const response = await fetch(targetUrl, {
        method: "GET",
        headers,
        redirect: "follow",
      });

      const html = await response.text();

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

      const cleaned = cleanHtml(html);

      return new Response(cleaned, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "text/html;charset=UTF-8",
        },
      });
    } catch (error) {
      return new Response(
        `Erro na infraestrutura do Worker: ${error.message}`,
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "text/plain;charset=UTF-8",
          },
        }
      );
    }
  },
};