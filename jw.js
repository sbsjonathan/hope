export default {
  async fetch(request) {
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

      out = out.replace(/\r\n/g, "\n");

      out = out.replace(
        /<link\b[^>]*\brel=(?:"|')alternate(?:"|')[^>]*>\s*/gi,
        ""
      );

      out = out.replace(
        /<meta\b[^>]*(?:property|name)=(?:"|')og:locale:alternate(?:"|')[^>]*>\s*/gi,
        ""
      );

      out = out.replace(
        /Gostaria\s+de\s+ler\s+este\s+artigo\s+em[\s\S]*?(?=(?:\b\d{1,2}\s*[-–]\s*\d{1,2}\s+DE\s+[A-ZÇÃÕÁÉÍÓÚ]+\s+DE\s+\d{4}\b|<h1\b|<main\b|<article\b))/i,
        ""
      );

      out = out.replace(
        /<script\b[^>]*>\s*document\.body\.className\s*=\s*document\.body\.className\.replace\([\s\S]*?\);\s*<\/script>\s*/gi,
        ""
      );

      out = out.replace(
        /<script\b[^>]*>\s*var\s+theme;\s*[\s\S]*?<\/script>\s*/gi,
        ""
      );

      out = out.replace(
        /<script\b[^>]*\bsrc=(?:"|')\/pt\/i18n\.js[^"']*(?:"|')[^>]*>\s*<\/script>\s*/gi,
        ""
      );

      out = out.replace(
        /<link\b[^>]*\bhref=(?:"|')https:\/\/b\.jw-cdn\.org\/code\/media-player\/[^"']*\/css\/media-player\.css(?:"|')[^>]*>\s*/gi,
        ""
      );

      out = out.replace(
        /<link\b[^>]*\bhref=(?:"|')https:\/\/assetsnffrgf-a\.akamaihd\.net\/assets\/ct\/[^"']*\/collector\.css(?:"|')[^>]*>\s*/gi,
        ""
      );

      out = out.replace(
        /<script\b[^>]*\bsrc=(?:"|')https:\/\/b\.jw-cdn\.org\/code\/media-player\/[^"']*\/js\/media-player\.min\.js[^"']*(?:"|')[^>]*>\s*<\/script>\s*/gi,
        ""
      );

      out = out.replace(
        /<script\b[^>]*\bsrc=(?:"|')https:\/\/www\.gstatic\.com\/cv\/js\/sender\/v1\/cast_sender\.js[^"']*(?:"|')[^>]*>\s*<\/script>\s*/gi,
        ""
      );

      out = out.replace(
        /<script\b[^>]*\bsrc=(?:"|')https:\/\/assetsnffrgf-a\.akamaihd\.net\/assets\/ct\/[^"']*\/thirdparty\.js(?:"|')[^>]*>\s*<\/script>\s*/gi,
        ""
      );

      out = out.replace(
        /<script\b[^>]*\bsrc=(?:"|')https:\/\/assetsnffrgf-a\.akamaihd\.net\/assets\/ct\/[^"']*\/legal-notices-client\.umd\.js(?:"|')[^>]*>\s*<\/script>\s*/gi,
        ""
      );

      out = out.replace(
        /<script\b[^>]*\bsrc=(?:"|')https:\/\/assetsnffrgf-a\.akamaihd\.net\/assets\/ct\/[^"']*\/cms\.js(?:"|')[^>]*>\s*<\/script>\s*/gi,
        ""
      );

      out = out.replace(
        /<script\b[^>]*\bsrc=(?:"|')https:\/\/assetsnffrgf-a\.akamaihd\.net\/assets\/ct\/[^"']*\/all-videos\.js(?:"|')[^>]*>\s*<\/script>\s*/gi,
        ""
      );

      return out;
    };

    const normalizeBlankLines = (html) => {
      let out = html.replace(/\r\n/g, "\n");
      out = out.replace(/[ \t]+\n/g, "\n");
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
        .on(".gen-field", { element: (el) => el.remove() })
        .on(".jsPinnedAudioPlayer", { element: (el) => el.remove() })
        .on(".jsAudioPlayer", { element: (el) => el.remove() })
        .on(".jsAudioFormat", { element: (el) => el.remove() })
        .on(".mobileNavLink", { element: (el) => el.remove() })
        .on(".articleNavLinks", { element: (el) => el.remove() })
        .on(".articleShareLinks", { element: (el) => el.remove() })
        .on(".articleFooterLinks", { element: (el) => el.remove() })
        .on("#mobileTOCNav", { element: (el) => el.remove() })
        .on("#sidebar", { element: (el) => el.remove() })
        .on("#sidebarTOC", { element: (el) => el.remove() })
        .on("footer", { element: (el) => el.remove() })
        .on("#templates", { element: (el) => el.remove() })
        .on(".subnavItem", { element: (el) => el.remove() })
        .on(".subNavItem", { element: (el) => el.remove() })
        .on("#screenReaderNavLinkTop", { element: (el) => el.remove() })
        .on("#pageConfig", { element: (el) => el.remove() })
        .on(".jsVideoPoster", { element: (el) => el.remove() })
        .on("#mobileNavTopBar", { element: (el) => el.remove() })
        .on("#regionHeader", { element: (el) => el.remove() })
        .on("#regionPrimaryNav", { element: (el) => el.remove() })
        .on(".breadcrumbs", { element: (el) => el.remove() })
        .on(".legal-notices-client--config", { element: (el) => el.remove() });

      const transformed = rewriter.transform(
        new Response(baseCleaned, {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "text/html;charset=UTF-8",
          },
        })
      );

      const finalHtml = normalizeBlankLines(await transformed.text());

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