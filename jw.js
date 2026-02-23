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
      const start = src.search(
        /<article\b[^>]*\bid=(?:"|')article(?:"|')[^>]*>/i
      );
      if (start < 0) return src;

      const endMatch = src.slice(start).match(/<\/article\s*>/i);
      if (!endMatch) return src.slice(start);

      const end = start + endMatch.index;
      return src.slice(start, end) + "</article>";
    };

    const stripTags = (s) => s.replace(/<[^>]+>/g, "");

    const processPerguntas = (html) => {
      return html.replace(
        /<p\b[^>]*\bclass=(["'])[^"']*\bqu\b[^"']*\1[^>]*>\s*<strong[^>]*>\s*([\s\S]*?)\s*<\/strong>\s*([\s\S]*?)<\/p>/gi,
        (_m, _q, strongPart, rest) => {
          const num = stripTags(strongPart).replace(/\s+/g, " ").trim();
          const texto = stripTags(rest).replace(/\s+/g, " ").trim();
          const conteudo = (num ? num + " " : "") + texto;
          return `\n\n<pergunta>${conteudo}</pergunta>\n\n`;
        }
      );
    };

    // >>>PROCESSADOR_2_INICIO<<<
    const PROCESSADOR_2 = (html) => {
      let out = html.replace(/\r\n/g, "\n");

      const docIdMatch = out.match(/\bdocId-(\d+)\b/i);
      const docId = docIdMatch ? docIdMatch[1] : "";

      const tt2OpenRe = /<div\b[^>]*\bid=(?:"|')tt2(?:"|')[^>]*>/i;
      const tt2OpenMatch = out.match(tt2OpenRe);
      if (!tt2OpenMatch) return out;

      const tt2OpenIdx = tt2OpenMatch.index;
      const tt2OpenTag = tt2OpenMatch[0];

      const colorMatch = tt2OpenTag.match(/\bdu-bgColor--([a-z0-9-]+)\b/i);
      const color = colorMatch ? colorMatch[1] : "";

      const openEnd = tt2OpenIdx + tt2OpenTag.length;

      let i = openEnd;
      let depth = 1;
      while (i < out.length) {
        const nextOpen = out.slice(i).search(/<div\b/i);
        const nextClose = out.slice(i).search(/<\/div\s*>/i);

        if (nextClose < 0) break;

        if (nextOpen >= 0 && nextOpen < nextClose) {
          depth++;
          i += nextOpen + 4;
          continue;
        }

        depth--;
        const closeStart = i + nextClose;
        const closeEnd =
          closeStart +
          out
            .slice(closeStart)
            .match(/<\/div\s*>/i)[0].length;

        if (depth === 0) {
          const inside = out.slice(openEnd, closeStart);
          const rest = out.slice(closeEnd);

          const prefix = `${docId}\n\n${color}\n\n`;
          out = prefix + inside + rest;
          return out;
        }

        i = closeEnd;
      }

      const prefix = `${docId}\n\n${color}\n\n`;
      out = prefix + out.slice(openEnd);
      return out;
    };
    // <<<PROCESSADOR_2_FIM<<<

    // >>>PROCESSADOR_3_INICIO<<<
    const PROCESSADOR_3 = (html) => {
      let out = html.replace(/\r\n/g, "\n");

      out = out.replace(
        /<p\b[^>]*\bclass=(["'])[^"']*\bcontextTtl\b[^"']*\1[^>]*>[\s\S]*?<\/p>/i,
        (m) => {
          const txt = stripTags(m).replace(/\s+/g, " ").trim();
          return `<estudo>${txt}</estudo>`;
        }
      );

      out = out.replace(
        /<div\b[^>]*\bid=(?:"|')tt4(?:"|')[^>]*>[\s\S]*?<\/div>/i,
        (m) => {
          const txt = stripTags(m).replace(/\s+/g, " ").trim();
          return `<cantico>${txt}</cantico>`;
        }
      );

      out = out.replace(
        /<h1\b[^>]*>[\s\S]*?<\/h1>/i,
        (m) => {
          const txt = stripTags(m).replace(/\s+/g, " ").trim();
          return `<tema>${txt}</tema>`;
        }
      );

      return out;
    };
    // <<<PROCESSADOR_3_FIM<<<

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

      const afterP2 = PROCESSADOR_2(cleaned);
      const afterP3 = PROCESSADOR_3(afterP2);
      const withPerguntas = processPerguntas(afterP3);
      const finalHtml = normalizeBlankLines(withPerguntas);

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