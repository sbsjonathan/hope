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

function stripTags(s) {
  return s.replace(/<[^>]+>/g, "");
}

function processPerguntas(html) {
  const preserveAllowedTags = (s) => {
    let t = (s || "").replace(/\r\n/g, "\n");

    t = t.replace(
      /<a\b[^>]*\bclass=(["'])[^"']*\bjsBibleLink\b[^"']*\1[^>]*>([\s\S]*?)<\/a>/gi,
      (_m, _q, inner) => {
        const txt = stripTags(inner).replace(/\s+/g, " ").trim();
        return `<bbl>${txt}</bbl>`;
      }
    );

    t = t.replace(/<\s*bbl\s*>/gi, "__BBL_OPEN__");
    t = t.replace(/<\s*\/\s*bbl\s*>/gi, "__BBL_CLOSE__");

    t = t.replace(/<\s*strong\s*>/gi, "__STRONG_OPEN__");
    t = t.replace(/<\s*\/\s*strong\s*>/gi, "__STRONG_CLOSE__");

    t = t.replace(/<\s*em\s*>/gi, "__EM_OPEN__");
    t = t.replace(/<\s*\/\s*em\s*>/gi, "__EM_CLOSE__");

    t = t.replace(/<[^>]+>/g, "");

    t = t.replace(/__BBL_OPEN__/g, "<bbl>");
    t = t.replace(/__BBL_CLOSE__/g, "</bbl>");

    t = t.replace(/__STRONG_OPEN__/g, "<strong>");
    t = t.replace(/__STRONG_CLOSE__/g, "</strong>");

    t = t.replace(/__EM_OPEN__/g, "<em>");
    t = t.replace(/__EM_CLOSE__/g, "</em>");

    t = t.replace(/\s+/g, " ").trim();

    return t;
  };

  return html.replace(
    /<p\b[^>]*\bclass=(["'])[^"']*\bqu\b[^"']*\1[^>]*>\s*<strong[^>]*>\s*([\s\S]*?)\s*<\/strong>\s*([\s\S]*?)<\/p>/gi,
    (_m, _q, strongPart, rest) => {
      const num = stripTags(strongPart).replace(/\s+/g, " ").trim();
      const texto = preserveAllowedTags(rest);
      const conteudo = (num ? num + " " : "") + texto;
      return `\n\n<pergunta>${conteudo}</pergunta>\n\n`;
    }
  );
}

// >>>PROCESSADOR_2_INICIO<<<
function PROCESSADOR_2(html) {
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
      closeStart + out.slice(closeStart).match(/<\/div\s*>/i)[0].length;

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
}
// <<<PROCESSADOR_2_FIM<<<

// >>>PROCESSADOR_3_INICIO<<<
function PROCESSADOR_3(html) {
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
}
// <<<PROCESSADOR_3_FIM<<<

// >>>PROCESSADOR_4_INICIO<<<
function PROCESSADOR_4(html) {
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
}
// <<<PROCESSADOR_4_FIM<<<

// >>>PROCESSADOR_5_INICIO<<<
function PROCESSADOR_5(html) {
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
}
// <<<PROCESSADOR_5_FIM<<<

// >>>PROCESSADOR_6_INICIO<<<
function PROCESSADOR_6(html) {
  let out = html.replace(/\r\n/g, "\n");

  out = out.replace(
    /<div\b[^>]*\bclass=(["'])[^"']*\bblockTeach\b[^"']*\1[^>]*>\s*<aside\b[^>]*>[\s\S]*?<\/aside>\s*<\/div>/gi,
    (m) => {
      const h2m = m.match(/<h2\b[^>]*>[\s\S]*?<\/h2>/i);
      const titulo = h2m ? stripTags(h2m[0]).replace(/\s+/g, " ").trim() : "";

      const itens = [];
      m.replace(
        /<li\b[^>]*>[\s\S]*?<p\b[^>]*>([\s\S]*?)<\/p>[\s\S]*?<\/li>/gi,
        (_mm, pInner) => {
          const t = stripTags(pInner).replace(/\s+/g, " ").trim();
          if (t) itens.push(t);
          return _mm;
        }
      );

      if (!titulo && itens.length === 0) return m;

      const bullets = itens.map((t) => `\n\n• ${t}`).join("");
      const conteudo = `${titulo}${bullets}`.trim();

      return `\n\n<recap>${conteudo}</recap>\n\n`;
    }
  );

  out = out.replace(
    /<div\b[^>]*\bid=(["'])f\d+\1[^>]*>[\s\S]*?<figure\b[^>]*>[\s\S]*?<span\b[^>]*\bclass=(["'])[^"']*\bjsRespImg\b[^"']*\2[^>]*>[\s\S]*?<\/span>[\s\S]*?<figcaption\b[^>]*>[\s\S]*?<\/figcaption>[\s\S]*?<\/figure>[\s\S]*?<\/div>\s*(?:<hr\b[^>]*>\s*)?/gi,
    (m) => {
      const lgMatch = m.match(/\bdata-img-size-lg=(["'])(.*?)\1/i);
      const src = lgMatch ? lgMatch[2] : "";
      if (!src) return m;

      const pMatch = m.match(
        /<figcaption\b[^>]*>[\s\S]*?<p\b[^>]*>([\s\S]*?)<\/p>[\s\S]*?<\/figcaption>/i
      );
      let pInner = pMatch ? pMatch[1] : "";
      if (!pInner) return m;

      pInner = pInner.replace(
        /<span\b[^>]*\bclass=(["'])[^"']*\brefID\b[^"']*\1[^>]*>[\s\S]*?<\/span>/gi,
        ""
      );
      pInner = pInner.replace(
        /<a\b[^>]*\bclass=(["'])[^"']*\bfootnoteLink\b[^"']*\1[^>]*>[\s\S]*?<\/a>/gi,
        " * "
      );

      const caption = stripTags(pInner).replace(/\s+/g, " ").trim();

      return `\n\n<figure>\n  <img src="${src}" />\n  <figcaption>\n    ${caption}\n  </figcaption>\n</figure>\n\n`;
    }
  );

  return out;
}
// <<<PROCESSADOR_6_FIM<<<

// >>>PROCESSADOR_7_INICIO<<<
function PROCESSADOR_7(html) {
  let out = html.replace(/\r\n/g, "\n");

  out = out.replace(
    /<h2\b[^>]*\bclass=(["'])[^"']*\bdu-textAlign--center\b[^"']*\1[^>]*>[\s\S]*?<\/h2>/gi,
    (m) => {
      const txt = stripTags(m).replace(/\s+/g, " ").trim();
      return txt ? `\n\n<subtitulo>${txt}</subtitulo>\n\n` : m;
    }
  );

  out = out.replace(
    /<div\b[^>]*\bclass=(["'])[^"']*\bdu-color--textSubdued\b[^"']*\1[^>]*>\s*<p\b[^>]*\bclass=(["'])[^"']*\bpubRefs\b[^"']*\2[^>]*>([\s\S]*?)<\/p>\s*<\/div>/gi,
    (m, _q1, _q2, inner) => {
      let s = inner || "";
      s = s.replace(
        /<span\b[^>]*\bclass=(["'])[^"']*\brefID\b[^"']*\1[^>]*>[\s\S]*?<\/span>/gi,
        ""
      );
      s = s.replace(/<a\b[^>]*>([\s\S]*?)<\/a>/gi, "$1");
      s = stripTags(s).replace(/\s+/g, " ").trim();

      if (!s) return m;
      if (!/\bCÂNTICO\b/i.test(s)) return m;

      return `\n\n<cantico>${s}</cantico>\n\n`;
    }
  );

  out = out.replace(
    /<div\b[^>]*\bclass=(["'])groupFootnote\1[^>]*>[\s\S]*?<\/div>\s*<\/div>/gi,
    (m) => {
      const pMatch = m.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i);
      if (!pMatch) return m;

      let inner = pMatch[1] || "";

      inner = inner.replace(
        /<a\b[^>]*\bclass=(["'])fn-symbol\1[^>]*>[\s\S]*?<\/a>/i,
        "*"
      );

      inner = inner.replace(/\s+/g, " ").trim();

      const note = inner.trim();
      if (!note) return "";

      return `\n\n<nota>${note}</nota>\n\n`;
    }
  );

  out = out.replace(/<\/?article\b[^>]*>/gi, "");

  const lastNotaEnd = out.lastIndexOf("</nota>");
  if (lastNotaEnd !== -1) {
    out = out.slice(0, lastNotaEnd + "</nota>".length) + "\n";
  }

  return out;
}
// <<<PROCESSADOR_7_FIM<<<
