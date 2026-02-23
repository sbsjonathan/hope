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

    const normalizeBlankLines = (html) => {
      let out = html.replace(/\r\n/g, "\n");
      out = out.replace(/[ \t]+\n/g, "\n");
      out = out.replace(/\n{3,}/g, "\n\n");
      return out.trim() + "\n";
    };

    const keepOnlyArticle = (html) => {
      const src = html.replace(/\r\n/g, "\n");
      const start = src.search(/<article\b[^>]*\bid=(?:"|')article(?:"|')[^>]*>/i);
      if (start < 0) return src;

      const end = src.search(/<\/article\s*>/i);
      if (end < 0 || end <= start) return src.slice(start);

      return src.slice(start, end) + "</article>";
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

      const onlyArticle = keepOnlyArticle(html);

      const rewriter = new HTMLRewriter()
        .on(".gen-field", { element: (el) => el.remove() })
        .on(".jsPinnedAudioPlayer", { element: (el) => el.remove() })
        .on(".jsAudioPlayer", { element: (el) => el.remove() })
        .on(".jsAudioFormat", { element: (el) => el.remove() })
        .on(".jsVideoPoster", { element: (el) => el.remove() })
        .on(".articleFooterLinks", { element: (el) => el.remove() })
        .on(".pageNum", { element: (el) => el.remove() });

      const cleaned = await rewriter
        .transform(
          new Response(onlyArticle, {
            headers: { "Content-Type": "text/html;charset=UTF-8" },
          })
        )
        .text();

      const finalHtml = normalizeBlankLines(cleaned);

      return new Response(finalHtml, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "text/html;charset=UTF-8",
        },
      });
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