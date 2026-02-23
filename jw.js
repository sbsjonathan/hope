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
          out.slice(closeStart).match(/<\/div\s*>/i)[0].length;

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
          return `<estudo>${txt}</estudo>\n\n`;
        }
      );

      out = out.replace(
        /<div\b[^>]*\bid=(?:"|')tt4(?:"|')[^>]*>[\s\S]*?<\/div>/i,
        (m) => {
          const txt = stripTags(m).replace(/\s+/g, " ").trim();
          return `<cantico>${txt}</cantico>\n\n`;
        }
      );

      out = out.replace(
        /<h1\b[^>]*>[\s\S]*?<\/h1>/i,
        (m) => {
          const txt = stripTags(m).replace(/\s+/g, " ").trim();
          return `<tema>${txt}</tema>\n\n`;
        }
      );

      return out;
    };
    // <<<PROCESSADOR_3_FIM<<<

    // >>>PROCESSADOR_4_INICIO<<<
    const PROCESSADOR_4 = (html) => {
      let out = html.replace(/\r\n/g, "\n");

      out = out.replace(
        /<a\b[^>]*\bclass=(["'])[^"']*\bjsBibleLink\b[^"']*\1[^>]*>([\s\S]*?)<\/a>/gi,
        (_m, _q, inner) => {
          const txt = stripTags(inner).replace(/\s+/g, " ").trim();
          return `<bbl>${txt}</bbl>`;
        }
      );

      out = out.replace(
        /<p\b[^>]*>\s*<span\b[^>]*\bclass=(["'])[^"']*\bparNum\b[^"']*\1[^>]*\bdata-pnum=(["'])(\d+)\2[^>]*>[\s\S]*?<\/span>\s*([\s\S]*?)<\/p>/gi,
        (_m, _q1, _q2, num, restHtml) => {
          let rest = restHtml || "";
          rest = rest.replace(/^\s+/, "").replace(/^\u00a0+/, "");
          rest = rest.replace(/\s+$/, "");
          return `<paragrafo>${num} ${rest}</paragrafo>`;
        }
      );

      return out;
    };
    // <<<PROCESSADOR_4_FIM<<<

    // >>>PROCESSADOR_5_INICIO<<<
    const PROCESSADOR_5 = (html) => {
      let out = html.replace(/\r\n/g, "\n");

      out = out.replace(
        /<\/tema>\s*<\/header>[\s\S]*?(?=<div\b[^>]*\bid=(?:"|')tt8(?:"|')[^>]*>|<p\b[^>]*\bclass=(?:"|')[^"']*\bthemeScrp\b[^"']*(?:"|')[^>]*>)/i,
        "</tema>\n\n"
      );

      out = out.replace(
        /<div\b[^>]*\bclass=(["'])[^"']*\bbodyTxt\b[^"']*\1[^>]*>/gi,
        ""
      );

      const stripTagsExceptBbl = (s) => {
        let t = s;
        t = t.replace(/<\s*bbl\s*>/gi, "__BBL_OPEN__");
        t = t.replace(/<\s*\/\s*bbl\s*>/gi, "__BBL_CLOSE__");
        t = t.replace(/<[^>]+>/g, "");
        t = t.replace(/__BBL_OPEN__/g, "<bbl>");
        t = t.replace(/__BBL_CLOSE__/g, "</bbl>");
        return t;
      };

      out = out.replace(
        /<div\b[^>]*\bid=(?:"|')tt8(?:"|')[^>]*>[\s\S]*?<p\b[^>]*\bclass=(["'])[^"']*\bthemeScrp\b[^"']*\1[^>]*>([\s\S]*?)<\/p>[\s\S]*?<\/div>/i,
        (_m, _q, inner) => {
          const txt = stripTagsExceptBbl(inner).replace(/\s+/g, " ").trim();
          return `<citacao>${txt}</citacao>\n\n`;
        }
      );

      out = out.replace(
        /<div\b[^>]*\bid=(?:"|')tt11(?:"|')[^>]*>[\s\S]*?<p\b[^>]*>[\s\S]*?<strong[^>]*>\s*OBJETIVO\s*<\/strong>[\s\S]*?<\/p>\s*<p\b[^>]*>([\s\S]*?)<\/p>[\s\S]*?<\/div>/i,
        (_m, body) => {
          const txt = stripTags(body).replace(/\s+/g, " ").trim();
          return `<objetivo>OBJETIVO\n\n${txt}</objetivo>\n\n`;
        }
      );

      return out;
    };
    // <<<PROCESSADOR_5_FIM<<<

    // >>>PROCESSADOR_6_INICIO<<<
    const PROCESSADOR_6 = (html) => {
      let out = html.replace(/\r\n/g, "\n");

      out = out.replace(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi, (_m, inner) => {
        const txt = stripTags(inner).replace(/\s+/g, " ").trim();
        return `\n\n<subtitulo>${txt}</subtitulo>\n\n`;
      });

      const buildFigure = (figureInner) => {
        const spanMatch = figureInner.match(
          /<span\b[^>]*\bclass=(["'])[^"']*\bjsRespImg\b[^"']*\1[^>]*>[\s\S]*?<\/span>/i
        );

        let src = "";
        let alt = "";

        if (spanMatch) {
          const spanTag = spanMatch[0];
          const lg = spanTag.match(/\bdata-img-size-lg=(["'])([^"']+)\1/i);
          const altM = spanTag.match(/\bdata-img-att-alt=(["'])([^"']*)\1/i);
          if (lg) src = lg[2];
          if (altM) alt = altM[2];
        }

        let caption = "";
        const figcapMatch = figureInner.match(
          /<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/i
        );
        if (figcapMatch) {
          caption = stripTags(figcapMatch[1]).replace(/\s+/g, " ").trim();
        }

        const imgBlock = `  <img src="${src}"\n       alt="${alt}">`;
        const capBlock = `  <figcaption>\n    ${caption}\n  </figcaption>`;

        return `\n\n<figure>\n${imgBlock}\n${capBlock}\n</figure>\n\n`;
      };

      out = out.replace(
        /<div\b[^>]*\bid=(?:"|')f\d+(?:"|')[^>]*>\s*<figure>([\s\S]*?)<\/figure>\s*<\/div>\s*<hr\b[^>]*>/gi,
        (_m, inner) => buildFigure(inner)
      );

      return out;
    };
    // <<<PROCESSADOR_6_FIM<<<

// >>>PROCESSADOR_7_INICIO<<<
const PROCESSADOR_7 = (html) => {
  let out = html.replace(/\r\n/g, "\n");

  const stripTagsPreserveEmStrongBbl = (s) => {
    let t = s;
    t = t.replace(/<\s*em\s*>/gi, "__EMO__");
    t = t.replace(/<\s*\/\s*em\s*>/gi, "__EMC__");
    t = t.replace(/<\s*strong\s*>/gi, "__STO__");
    t = t.replace(/<\s*\/\s*strong\s*>/gi, "__STC__");
    t = t.replace(/<\s*bbl\s*>/gi, "__BBLO__");
    t = t.replace(/<\s*\/\s*bbl\s*>/gi, "__BBLC__");
    t = t.replace(/<[^>]+>/g, "");
    t = t
      .replace(/__EMO__/g, "<em>")
      .replace(/__EMC__/g, "</em>")
      .replace(/__STO__/g, "<strong>")
      .replace(/__STC__/g, "</strong>")
      .replace(/__BBLO__/g, "<bbl>")
      .replace(/__BBLC__/g, "</bbl>");
    return t;
  };

  const titleCaseFromAllCaps = (s) => {
    const raw = (s || "").replace(/\s+/g, " ").trim();
    return raw
      .split(" ")
      .map((w) => {
        const clean = w.replace(/[^\p{L}\p{N}]+/gu, "");
        if (!clean) return w;
        const isAllCaps =
          clean === clean.toUpperCase() &&
          clean !== clean.toLowerCase();
        if (!isAllCaps) return w;
        const first = w.slice(0, 1);
        const rest = w.slice(1);
        return first + rest.toLowerCase();
      })
      .join(" ")
      .replace(/\s*:\s*$/, ":");
  };

  out = out.replace(
    /<subtitulo>([\s\S]*?)<\/subtitulo>\s*<\/div>\s*<div\b[^>]*\bboxContent\b[^>]*>\s*<ul>([\s\S]*?)<\/ul>\s*<\/div>\s*<\/aside>\s*<\/div>/i,
    (_m, subInner, ulInner) => {
      const titleRaw = subInner.replace(/<[^>]+>/g, " ");
      const title = titleCaseFromAllCaps(titleRaw);

      const items = [];
      ulInner.replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, (_mm, liInner) => {
        const txt = liInner.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        if (txt) items.push(txt);
        return "";
      });

      let bullets = "";
      for (const it of items) bullets += `\n\n• ${it}`;

      return `<recap>${title}${bullets}</recap>\n\n`;
    }
  );

  out = out.replace(
    /<div\b[^>]*\bid=(?:"|')tt39(?:"|')[^>]*>[\s\S]*?<p\b[^>]*\bclass=(["'])[^"']*\bpubRefs\b[^"']*\1[^>]*>([\s\S]*?)<\/p>[\s\S]*?<\/div>/i,
    (_m, _q, inner) => {
      const txt = inner.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      return `<cantico>${txt}</cantico>\n\n`;
    }
  );

  out = out.replace(
    /<div\b[^>]*\bclass=(["'])[^"']*\bgroupFootnote\b[^"']*\1[^>]*>[\s\S]*?<div\b[^>]*\bid=(?:"|')footnote\d+(?:"|')[^>]*>\s*<p\b[^>]*>([\s\S]*?)<\/p>\s*<\/div>[\s\S]*?<\/div>/i,
    (_m, _q, inner) => {
      let txt = stripTagsPreserveEmStrongBbl(inner).replace(/\s+/g, " ").trim();
      txt = txt.replace(/^[a-z]\s+/i, "* ");
      txt = txt.replace(/^\*\s+/, "* ");
      return `<nota>${txt}</nota>\n\n`;
    }
  );

  out = out.replace(/<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/article>\s*$/i, "");

  return out;
};
// <<<PROCESSADOR_7_FIM<<<

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
      const afterP4 = PROCESSADOR_4(afterP3);
      const afterP5 = PROCESSADOR_5(afterP4);
      const afterP6 = PROCESSADOR_6(afterP5);
      const afterP7 = PROCESSADOR_7(afterP6);
      const withPerguntas = processPerguntas(afterP7);
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