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

    const cleanHtmlBase = (html) => {
      let out = html;

      // alternates/hreflang + og:locale:alternate (idiomas no HEAD)
      out = out.replace(
        /<link\b[^>]*\brel=(?:"|')alternate(?:"|')[^>]*>/gi,
        ""
      );
      out = out.replace(
        /<meta\b[^>]*(?:property|name)=(?:"|')og:locale:alternate(?:"|')[^>]*>/gi,
        ""
      );

      // bloco gigante de idiomas "Gostaria de ler este artigo em..."
      out = out.replace(
        /Gostaria\s+de\s+ler\s+este\s+artigo\s+em[\s\S]*?(?=(?:\b\d{1,2}\s*[-–]\s*\d{1,2}\s+DE\s+[A-ZÇÃÕÁÉÍÓÚ]+\s+DE\s+\d{4}\b|<h1\b|<main\b|<article\b))/i,
        ""
      );

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
        "Upgrade-Insecure-Requests": "1",
      });

      const upstream = await fetch(targetUrl, {
        method: "GET",
        headers,
        redirect: "follow",
      });

      const html = await upstream.text();

      if (!upstream.ok) {
        return new Response(
          `Erro do site alvo: Status ${upstream.status}\n\nCódigo-fonte do erro:\n${html}`,
          {
            status: upstream.status,
            headers: {
              ...corsHeaders,
              "Content-Type": "text/plain;charset=UTF-8",
            },
          }
        );
      }

      const baseCleaned = cleanHtmlBase(html);

      const rewriter = new HTMLRewriter()
        // (5) remove "Sua resposta" / textareas
        .on(".gen-field", {
          element(el) {
            el.remove();
          },
        })

        // (6) remove player / UI de áudio
        .on(".jsPinnedAudioPlayer", {
          element(el) {
            el.remove();
          },
        })
        .on(".jsAudioPlayer", {
          element(el) {
            el.remove();
          },
        })
        .on(".jsAudioFormat", {
          element(el) {
            el.remove();
          },
        })

        // (NOVO) remove itens do menu mobile (mobileNavLink...)
        .on(".mobileNavLink", {
          element(el) {
            el.remove();
          },
        })

        // (NOVO) remove a barra superior mobile (logo/idioma/botões)
        .on("#mobileNavTopBar", {
          element(el) {
            el.remove();
          },
        });

      const response = new Response(baseCleaned, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "text/html;charset=UTF-8",
        },
      });

      return rewriter.transform(response);
    } catch (error) {
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