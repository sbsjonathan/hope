export default {
  async fetch(request, env, ctx) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    const urlParams = new URL(request.url).searchParams;
    let targetUrl = urlParams.get("url");
    const arquivoRtf = urlParams.get("arquivo");

    let debugLog = {
      receivedArquivo: arquivoRtf,
      issueParsed: null,
      studyParsed: null,
      tocUrlFetched: null,
      tocMatches:[],
      finalTargetUrl: null,
      error: null
    };

    try {
      if (!targetUrl && arquivoRtf) {
        const match = arquivoRtf.match(/w_T_(\d{6})_(\d{2})\.rtf/i);
        if (match) {
          debugLog.issueParsed = match[1];
          debugLog.studyParsed = parseInt(match[2], 10);
          
          const fallbackData = await getFallbackUrlFromTOC(debugLog.issueParsed, debugLog.studyParsed);
          if (fallbackData.url) {
            targetUrl = fallbackData.url;
            debugLog.finalTargetUrl = targetUrl;
          } else {
            debugLog.error = fallbackData.error;
          }
          debugLog.tocUrlFetched = fallbackData.tocUrl;
          debugLog.tocMatches = fallbackData.matches ||[];
        } else {
          debugLog.error = "Expressão w_T_(\\d{6})_(\\d{2}) falhou no arquivoRtf";
        }
      }

      // Se continuou sem achar o link, retorna o erro 400 mas COM O DEBUG JUNTO!
      if (!targetUrl) {
         return new Response(`<!-- DEBUG_WORKER: ${JSON.stringify(debugLog)} -->\n❌ Erro ao descobrir o link correto da JW.org.\nMotivo: ${debugLog.error}\nAbra o Console da Engrenagem para mais detalhes.`, { 
             status: 400, headers: { ...corsHeaders, "Content-Type": "text/html;charset=UTF-8" } 
         });
      }

      const headers = new Headers({
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/121.0.0.0",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9",
        "Accept-Language": "pt-BR,pt;q=0.9"
      });

      let response = await fetch(targetUrl, { method: "GET", headers, redirect: "follow" });
      const rawHtml = await response.text();

      if (!response.ok) {
        debugLog.error = `Erro HTTP no site alvo: ${response.status}`;
        return new Response(`<!-- DEBUG_WORKER: ${JSON.stringify(debugLog)} -->\nErro do site alvo JW.org: Status ${response.status}`, {
          status: response.status, headers: { ...corsHeaders, "Content-Type": "text/html;charset=UTF-8" },
        });
      }

      let hexColor = "";
      const tokenMatch = rawHtml.match(/\bdu-bgColor--([a-z0-9-]+)\b/i);
      if (tokenMatch) hexColor = await fetchHexFromCss(rawHtml, targetUrl, tokenMatch[0]);
      if (!hexColor) hexColor = tokenMatch ? tokenMatch[1] : "";

      const onlyArticle = keepOnlyArticle(rawHtml);

      const rewriter = new HTMLRewriter()
        .on(".gen-field", { element: (el) => el.remove() })
        .on(".jsPinnedAudioPlayer", { element: (el) => el.remove() })
        .on(".jsAudioPlayer", { element: (el) => el.remove() })
        .on(".jsAudioFormat", { element: (el) => el.remove() })
        .on(".jsVideoPoster", { element: (el) => el.remove() })
        .on(".articleFooterLinks", { element: (el) => el.remove() })
        .on(".pageNum", { element: (el) => el.remove() });

      const cleaned = await rewriter.transform(new Response(onlyArticle, { headers: { "Content-Type": "text/html;charset=UTF-8" } })).text();

      const afterP2 = PROCESSADOR_2(cleaned, hexColor);
      const afterP3 = PROCESSADOR_3(afterP2);
      const afterP4 = PROCESSADOR_4(afterP3);
      const afterP5 = PROCESSADOR_5(afterP4);
      const afterP6 = PROCESSADOR_6(afterP5);
      const afterP7 = PROCESSADOR_7(afterP6);
      
      const withPerguntas = processPerguntas(afterP7);
      
      const finalHtml = normalizeBlankLines(withPerguntas) + `\n\n<!-- DEBUG_WORKER: ${JSON.stringify(debugLog)} -->`;

      return new Response(finalHtml, { status: 200, headers: { ...corsHeaders, "Content-Type": "text/html;charset=UTF-8" } });

    } catch (error) {
      debugLog.error = error.message;
      return new Response(`<!-- DEBUG_WORKER: ${JSON.stringify(debugLog)} -->\nErro no Worker: ${error.message}`, {
        status: 500, headers: { ...corsHeaders, "Content-Type": "text/html;charset=UTF-8" },
      });
    }
  },
};

async function getFallbackUrlFromTOC(issue, studyNumber) {
  const ano = issue.slice(0, 4);
  const mesNum = issue.slice(4, 6);
  const meses = {
    "01": "janeiro", "02": "fevereiro", "03": "marco", "04": "abril", "05": "maio", "06": "junho", 
    "07": "julho", "08": "agosto", "09": "setembro", "10": "outubro", "11": "novembro", "12": "dezembro"
  };

  const mesNome = meses[mesNum];
  if (!mesNome) return { error: "Mês inválido detectado no script" };

  const tocUrl = `https://www.jw.org/pt/biblioteca/revistas/sentinela-estudo-${mesNome}-${ano}/`;
  
  // AQUI ESTÁ A CORREÇÃO: Fomos bloqueados por falta deste "User-Agent"
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/121.0.0.0",
    "Accept": "text/html"
  };

  const res = await fetch(tocUrl, { headers });
  if (!res.ok) return { error: `A JW.org bloqueou a busca do Índice com o Erro: ${res.status}` };

  const html = await res.text();
  
  // AQUI ESTÁ A CORREÇÃO DA REGEX: Permitindo acentos e URLs exatas de href
  const regex = new RegExp(`href=["'](/pt/biblioteca/revistas/sentinela-estudo-${mesNome}-${ano}/[^"']+)["']`, "gi");

  let matches =[];
  let match;
  while ((match = regex.exec(html)) !== null) {
    matches.push(match[1]);
  }

  // Remove URLs duplicadas
  matches =[...new Set(matches)];
  
  // Remove o link principal para sobrarem só os artigos
  matches = matches.filter(m => {
    const semBarra = m.replace(/\/$/, '');
    return !semBarra.endsWith(`${mesNome}-${ano}`);
  });

  const idx = studyNumber - 1;
  if (idx >= 0 && idx < matches.length) {
    let urlMontada = `https://www.jw.org` + matches[idx];
    if (!urlMontada.endsWith('/')) urlMontada += '/';
    return { url: urlMontada, tocUrl, matches };
  }
  return { error: `Não encontrou o artigo ${studyNumber}. A revista tem apenas ${matches.length} artigos listados.`, tocUrl, matches };
}

async function fetchHexFromCss(html, baseUrl, tokenClass) {
  try {
    const baseMatch = html.match(/<base\b[^>]*href\s*=\s*["']([^"']+)["']/i);
    const baseHref = baseMatch ? baseMatch[1] : baseUrl;
    const hrefs =[];
    const linkRe = /<link\b[^>]*>/gi;

    let lm;
    while ((lm = linkRe.exec(html)) !== null) {
      const tag = lm[0];
      const relM = tag.match(/\brel\s*=\s*["']([^"']+)["']/i);
      const hrefM = tag.match(/\bhref\s*=\s*["']([^"']+)["']/i);
      if (!hrefM) continue;

      const rel = (relM ? relM[1] : "").toLowerCase();
      const asM = tag.match(/\bas\s*=\s*["']([^"']+)["']/i);
      const asVal = (asM ? asM[1] : "").toLowerCase();

      if (!rel.includes("stylesheet") && !(rel.includes("preload") && asVal === "style")) continue;
      const rawHref = hrefM[1].trim();
      if (!rawHref) continue;

      const abs = new URL(rawHref, baseHref).toString();
      if (abs.toLowerCase().includes(".css")) hrefs.push(abs);
    }

    const collectorUrl = hrefs.find((u) => /collector(\.|-)?[^/]*\.css/i.test(u)) || hrefs.find((u) => /collector/i.test(u));
    if (collectorUrl) {
      const cssResp = await fetch(collectorUrl, { headers: { "User-Agent": "Mozilla/5.0 Chrome/121.0.0.0" } });
      if (cssResp.ok) {
        const css = await cssResp.text();
        const esc = tokenClass.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const bgHexRe = new RegExp("\\.jwac\\s+\\." + esc + "\\b[\\s\\S]*?\\{[\\s\\S]*?background-color\\s*:\\s*(#[0-9a-fA-F]{3,6})", "i");
        let bgM = css.match(bgHexRe);
        if (bgM && bgM[1]) return bgM[1];
        const fbg = css.match(new RegExp("\\." + esc + "\\b[\\s\\S]*?\\{[\\s\\S]*?background-color\\s*:\\s*(#[0-9a-fA-F]{3,6})", "i"));
        if (fbg && fbg[1]) return fbg[1];
      }
    }
  } catch (e) { return null; }
  return null;
}

function normalizeBlankLines(html) {
  let out = html.replace(/\r\n/g, "\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n");
  return out.trim() + "\n";
}

function keepOnlyArticle(html) {
  const src = html.replace(/\r\n/g, "\n");
  const start = src.search(/<article\b[^>]*\bid=(?:"|')article(?:"|')[^>]*>/i);
  if (start < 0) return src;
  const endMatch = src.slice(start).match(/<\/article\s*>/i);
  if (!endMatch) return src.slice(start);
  const end = start + endMatch.index;
  return src.slice(start, end) + "</article>";
}

function stripTags(s) { return s.replace(/<[^>]+>/g, ""); }

function processPerguntas(html) {
  const preserveAllowedTags = (s) => {
    let t = (s || "").replace(/\r\n/g, "\n");
    t = t.replace(/<a\b[^>]*\bclass=(["'])[^"']*\bjsBibleLink\b[^"']*\1[^>]*>([\s\S]*?)<\/a>/gi, (_m, _q, inner) => `<bbl>${stripTags(inner).replace(/\s+/g, " ").trim()}</bbl>`);
    t = t.replace(/<\s*bbl\s*>/gi, "__BBL_OPEN__").replace(/<\s*\/\s*bbl\s*>/gi, "__BBL_CLOSE__");
    t = t.replace(/<\s*strong\s*>/gi, "__STRONG_OPEN__").replace(/<\s*\/\s*strong\s*>/gi, "__STRONG_CLOSE__");
    t = t.replace(/<\s*em\s*>/gi, "__EM_OPEN__").replace(/<\s*\/\s*em\s*>/gi, "__EM_CLOSE__");
    t = t.replace(/<[^>]+>/g, "");
    t = t.replace(/__BBL_OPEN__/g, "<bbl>").replace(/__BBL_CLOSE__/g, "</bbl>");
    t = t.replace(/__STRONG_OPEN__/g, "<strong>").replace(/__STRONG_CLOSE__/g, "</strong>");
    t = t.replace(/__EM_OPEN__/g, "<em>").replace(/__EM_CLOSE__/g, "</em>");
    return t.replace(/\s+/g, " ").trim();
  };
  return html.replace(
    /<p\b[^>]*\bclass=(["'])[^"']*\bqu\b[^"']*\1[^>]*>\s*<strong[^>]*>\s*([\s\S]*?)\s*<\/strong>([\s\S]*?)<\/p>/gi,
    (_m, _q, strongPart, rest) => {
      const num = stripTags(strongPart).replace(/\s+/g, "").trim();
      const texto = preserveAllowedTags(rest);
      return `\n\n<pergunta>${(num ? num + " " : "") + texto}</pergunta>\n\n`;
    }
  );
}

function PROCESSADOR_2(html, hexColor) {
  let out = html.replace(/\r\n/g, "\n");
  const docIdMatch = out.match(/\bdocId-(\d+)\b/i);
  const docId = docIdMatch ? docIdMatch[1] : "";
  const tt2OpenRe = /<div\b[^>]*\bid=(?:"|')tt2(?:"|')[^>]*>/i;
  const tt2OpenMatch = out.match(tt2OpenRe);
  if (!tt2OpenMatch) return out;
  const tt2OpenIdx = tt2OpenMatch.index;
  const tt2OpenTag = tt2OpenMatch[0];
  const openEnd = tt2OpenIdx + tt2OpenTag.length;
  let i = openEnd, depth = 1;
  while (i < out.length) {
    const nextOpen = out.slice(i).search(/<div\b/i);
    const nextClose = out.slice(i).search(/<\/div\s*>/i);
    if (nextClose < 0) break;
    if (nextOpen >= 0 && nextOpen < nextClose) { depth++; i += nextOpen + 4; continue; }
    depth--;
    const closeStart = i + nextClose;
    const closeEnd = closeStart + out.slice(closeStart).match(/<\/div\s*>/i)[0].length;
    if (depth === 0) {
      const inside = out.slice(openEnd, closeStart), rest = out.slice(closeEnd);
      return `${docId}\n\n${hexColor}\n\n` + inside + rest;
    }
    i = closeEnd;
  }
  return `${docId}\n\n${hexColor}\n\n` + out.slice(openEnd);
}

function PROCESSADOR_3(html) {
  let out = html.replace(/\r\n/g, "\n");
  out = out.replace(/<p\b[^>]*\bclass=(["'])[^"']*\bcontextTtl\b[^"']*\1[^>]*>[\s\S]*?<\/p>/i, (m) => `<estudo>${stripTags(m).replace(/\s+/g, " ").trim()}</estudo>\n\n`);
  out = out.replace(/<div\b[^>]*\bid=(?:"|')tt4(?:"|')[^>]*>[\s\S]*?<\/div>/i, (m) => `<cantico>${stripTags(m).replace(/\s+/g, " ").trim()}</cantico>\n\n`);
  out = out.replace(/<h1\b[^>]*>[\s\S]*?<\/h1>/i, (m) => `<tema>${stripTags(m).replace(/\s+/g, " ").trim()}</tema>\n\n`);
  return out;
}

function PROCESSADOR_4(html) {
  let out = html.replace(/\r\n/g, "\n");
  out = out.replace(/<a\b[^>]*\bclass=(["'])[^"']*\bjsBibleLink\b[^"']*\1[^>]*>([\s\S]*?)<\/a>/gi, (_m, _q, inner) => `<bbl>${stripTags(inner).replace(/\s+/g, " ").trim()}</bbl>`);
  out = out.replace(/<p\b[^>]*>\s*<span\b[^>]*\bclass=(["'])[^"']*\bparNum\b[^"']*\1[^>]*\bdata-pnum=(["'])(\d+)\2[^>]*>[\s\S]*?<\/span>([\s\S]*?)<\/p>/gi, (_m, _q1, _q2, num, restHtml) => {
      let rest = (restHtml || "").replace(/^\s+/, "").replace(/^\u00a0+/, "").replace(/\s+$/, "");
      return `<paragrafo>${num} ${rest}</paragrafo>`;
  });
  return out;
}

function PROCESSADOR_5(html) {
  let out = html.replace(/\r\n/g, "\n");
  out = out.replace(/<\/tema>\s*<\/header>[\s\S]*?(?=<div\b[^>]*\bid=(?:"|')tt8(?:"|')[^>]*>|<p\b[^>]*\bclass)/i, "</tema>\n\n");
  out = out.replace(/<div\b[^>]*\bclass=(["'])[^"']*\bbodyTxt\b[^"']*\1[^>]*>/gi, "");
  const stripTagsExceptBbl = (s) => {
    let t = s.replace(/<\s*bbl\s*>/gi, "__BBL_OPEN__").replace(/<\s*\/\s*bbl\s*>/gi, "__BBL_CLOSE__");
    t = t.replace(/<[^>]+>/g, "");
    return t.replace(/__BBL_OPEN__/g, "<bbl>").replace(/__BBL_CLOSE__/g, "</bbl>");
  };
  out = out.replace(/<div\b[^>]*\bid=(?:"|')tt8(?:"|')[^>]*>[\s\S]*?<p\b[^>]*\bclass=(["'])[^"']*\bthemeScrp\b[^"']*\1[^>]*>([\s\S]*?)<\/p>[\s\S]*?<\/div>/gi, (_m, _q, inner) => `<citacao>${stripTagsExceptBbl(inner).replace(/\s+/g, " ").trim()}</citacao>\n\n`);
  out = out.replace(/<div\b[^>]*\bid=(?:"|')tt11(?:"|')[^>]*>[\s\S]*?<p\b[^>]*>[\s\S]*?<strong[^>]*>\s*OBJETIVO\s*<\/strong>([\s\S]*?)<\/p>[\s\S]*?<\/div>/gi, (_m, body) => `<objetivo>OBJETIVO\n\n${stripTags(body).replace(/\s+/g, " ").trim()}</objetivo>\n\n`);
  return out;
}

function PROCESSADOR_6(html) {
  let out = html.replace(/\r\n/g, "\n");
  out = out.replace(/<div\b[^>]*\bclass=(["'])[^"']*\bblockTeach\b[^"']*\1[^>]*>\s*<aside\b[^>]*>[\s\S]*?<\/aside>/gi, (m) => {
      const h2m = m.match(/<h2\b[^>]*>[\s\S]*?<\/h2>/i);
      const titulo = h2m ? stripTags(h2m[0]).replace(/\s+/g, " ").trim() : "";
      const itens =[];
      m.replace(/<li\b[^>]*>[\s\S]*?<p\b[^>]*>([\s\S]*?)<\/p>[\s\S]*?<\/li>/gi, (_mm, pInner) => {
        const t = stripTags(pInner).replace(/\s+/g, " ").trim();
        if (t) itens.push(t);
        return _mm;
      });
      if (!titulo && itens.length === 0) return m;
      return `\n\n<recap>${(titulo + itens.map((t) => `\n\n• ${t}`).join("")).trim()}</recap>`;
  });
  out = out.replace(/<div\b[^>]*\bid=(["'])f\d+\1[^>]*>[\s\S]*?<figure\b[^>]*>[\s\S]*?<span\b[^>]*\bclass=(["']).*?data-img-size-lg=(["'])(.*?)\3/gi, (m, id, qClass, qLg, src) => {
      if (!src) return m;
      const pMatch = m.match(/<figcaption\b[^>]*>[\s\S]*?<p\b[^>]*>([\s\S]*?)<\/p>[\s\S]*?<\/figcaption>/i);
      if (!pMatch || !pMatch[1]) return m;
      let pInner = pMatch[1].replace(/<span\b[^>]*\bclass=(["'])[^"']*\brefID\b[^"']*\1[^>]*>[\s\S]*?<\/span>/gi, "").replace(/<a\b[^>]*\bclass=(["'])[^"']*\bfootnoteLink\b[^"']*\1[^>]*>[\s\S]*?<\/a>/gi, "");
      return `\n\n<figure>\n <img src="${src}" />\n <figcaption>\n${stripTags(pInner).trim()}\n </figcaption>\n</figure>\n\n`;
  });
  return out;
}

function PROCESSADOR_7(html) {
  let out = html.replace(/\r\n/g, "\n");
  out = out.replace(/<h2\b[^>]*\bclass=(["'])[^"']*\bdu-textAlign--center\b[^"']*\1[^>]*>[\s\S]*?<\/h2>/gi, (m) => {
      const txt = stripTags(m).replace(/\s+/g, " ").trim();
      return txt ? `\n\n<subtitulo>${txt}</subtitulo>\n\n` : m;
  });
  out = out.replace(/<div\b[^>]*\bclass=(["'])[^"']*\bdu-color--textSubdued\b[^"']*\1[^>]*>\s*<p\b[^>]*\bclass/gi, (m) => m);
  out = out.replace(/<div\b[^>]*\bclass=(["'])groupFootnote\1[^>]*>[\s\S]*?<\/div>\s*<\/div>/gi, (m) => {
      const pMatch = m.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i);
      if (!pMatch) return m;
      let inner = pMatch[1].replace(/<a\b[^>]*\bclass=(["'])fn-symbol\1[^>]*>[\s\S]*?<\/a>/i, "");
      const note = inner.replace(/\s+/g, " ").trim();
      return note ? `\n\n<nota>${note}</nota>\n\n` : "";
  });
  out = out.replace(/<\/?article\b[^>]*>/gi, "");
  const lastNotaEnd = out.lastIndexOf("</nota>");
  if (lastNotaEnd !== -1) out = out.slice(0, lastNotaEnd + "</nota>".length) + "\n";
  return out;
}