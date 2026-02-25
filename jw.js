export default {
  async fetch(request, env, ctx) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const urlParams = new URL(request.url).searchParams;
    const issue = urlParams.get("issue"); // ex: 202601
    const study = urlParams.get("study"); // ex: 01
    
    // Se o usuário passar uma URL direta de teste, ele usa, senão ele vai "caçar" via issue e study
    let targetUrl = urlParams.get("url");

    try {
      // ==========================================
      // PARTE 1: CAÇANDO O LINK JW.ORG (Módulo 5)
      // ==========================================
      if (!targetUrl && issue && study) {
        targetUrl = await getJwTargetUrl(issue, study);
      }

      // Fallback de segurança (Link fixo apenas caso faltem parâmetros)
      if (!targetUrl) {
        targetUrl = "https://www.jw.org/pt/biblioteca/revistas/sentinela-estudo-janeiro-2026/Continue-cuidando-da-sua-necessidade-espiritual/";
      }

      const headers = new Headers({
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
        "Cache-Control": "max-age=0",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Upgrade-Insecure-Requests": "1",
      });

      const response = await fetch(targetUrl, { method: "GET", headers, redirect: "follow" });
      const rawHtml = await response.text();

      if (!response.ok) {
        return new Response(`Erro do site alvo: Status ${response.status}`, {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "text/plain;charset=UTF-8" },
        });
      }

      // ==========================================
      // PARTE 2: CAÇANDO O HEX NO CSS (Módulo 7)
      // ==========================================
      let hexColor = "";
      // Procura a classe token de cor no HTML recém baixado
      const tokenMatch = rawHtml.match(/\bdu-bgColor--([a-z0-9-]+)\b/i);
      if (tokenMatch) {
        const tokenClass = tokenMatch[0]; // ex: "du-bgColor--blue700"
        hexColor = await fetchHexFromCss(rawHtml, targetUrl, tokenClass);
      }
      
      // Se não conseguiu achar o hex no CSS, envia pelo menos o nome da cor como fallback
      if (!hexColor) hexColor = tokenMatch ? tokenMatch[1] : "";


      // ==========================================
      // PARTE 3: O RESTO DO PROCESSAMENTO NORMAL
      // ==========================================
      const onlyArticle = keepOnlyArticle(rawHtml);

      const rewriter = new HTMLRewriter()
        .on(".gen-field", { element: (el) => el.remove() })
        .on(".jsPinnedAudioPlayer", { element: (el) => el.remove() })
        .on(".jsAudioPlayer", { element: (el) => el.remove() })
        .on(".jsAudioFormat", { element: (el) => el.remove() })
        .on(".jsVideoPoster", { element: (el) => el.remove() })
        .on(".articleFooterLinks", { element: (el) => el.remove() })
        .on(".pageNum", { element: (el) => el.remove() });

      const cleaned = await rewriter.transform(
        new Response(onlyArticle, { headers: { "Content-Type": "text/html;charset=UTF-8" } })
      ).text();

      // Repassamos a cor descoberta para o PROCESSADOR_2 aplicar no topo
      const afterP2 = PROCESSADOR_2(cleaned, hexColor);
      const afterP3 = PROCESSADOR_3(afterP2);
      const afterP4 = PROCESSADOR_4(afterP3);
      const afterP5 = PROCESSADOR_5(afterP4);
      const afterP6 = PROCESSADOR_6(afterP5);
      const afterP7 = PROCESSADOR_7(afterP6);
      
      const withPerguntas = processPerguntas(afterP7);
      const finalHtml = normalizeBlankLines(withPerguntas);

      return new Response(finalHtml, {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "text/html;charset=UTF-8" },
      });

    } catch (error) {
      return new Response(`Erro na infraestrutura do Worker: ${error.message}\n${error.stack}`, {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "text/plain;charset=UTF-8" },
      });
    }
  },
};

// =========================================================================
// FUNÇÃO MÁGICA 1: CAÇA O LINK JW (Baixa RTF -> Limpa -> Título -> Slug)
// =========================================================================
async function getJwTargetUrl(issue, studyNumber) {
  // 1. Busca URL do RTF na API Oficial
  const apiUrl = `https://b.jw-cdn.org/apis/pub-media/GETPUBMEDIALINKS?pub=w&issue=${issue}&langwritten=T&txtCMSLang=T&fileformat=RTF&output=json&alllangs=0`;
  const apiRes = await fetch(apiUrl);
  const data = await apiRes.json();
  
  const rtfList = data?.files?.T?.RTF;
  if (!rtfList) throw new Error("Lista RTF não encontrada na API.");
  
  const wantedName = `w_T_${issue}_${studyNumber.padStart(2, '0')}.rtf`;
  const fileObj = rtfList.find(x => x.name === wantedName || x.file?.url?.endsWith("/" + wantedName));
  if (!fileObj) throw new Error(`Estudo RTF não encontrado: ${wantedName}`);
  
  const rtfUrl = fileObj.file.url;

  // 2. Baixa o conteúdo do RTF
  const rtfRes = await fetch(rtfUrl);
  let texto = await rtfRes.text();

  // 3. Limpeza brutal do RTF (Apenas para conseguir extrair o texto do Título)
  texto = texto.replace(/\[Leitura do texto de\][\s\S]*?\[Fim da leitura\.?\]/gi, " ");
  texto = texto.replace(/\\u(-?\d+)\?/g, (_, n) => { let code = parseInt(n, 10); return String.fromCharCode(code < 0 ? 65536 + code : code); });
  texto = texto.replace(/\\'([0-9a-fA-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  texto = texto.replace(/\{\\\*[^{}]*\}/g, " ").replace(/\{\\[a-z]+[\s\S]*?\}/gi, " ");
  texto = texto.replace(/\\par(?![a-zA-Z])/g, "\n").replace(/\\line(?![a-zA-Z])/g, "\n").replace(/\\tab(?![a-zA-Z])/g, " ");
  texto = texto.replace(/\\[a-zA-Z]+\d*(?:-\d+)?\s?/g, " ").replace(/[{}]/g, " ");

  let limpas = texto.split("\n")
    .map(l => l.replace(/^\s+/g, "").replace(/\s+$/g, "").replace(/[ \t]{2,}/g, " "))
    .filter(l => l.length >= 2)
    .map(l => l.replace(/Copyright\s*©.*?Pennsylvania/gi, "").trim())
    .filter(Boolean);

  // 4. Acha o Título (Geralmente a linha logo depois do Cântico)
  let tagTema = "";
  let achouCantico = false;
  for (let i = 0; i < limpas.length; i++) {
    let txt = limpas[i];
    if (/^c[âa]ntico\b/i.test(txt)) {
      achouCantico = true;
      continue;
    }
    if (achouCantico && !tagTema && !/^pergunta\s+\d+/i.test(txt) && !/^\d+\s+/.test(txt)) {
      tagTema = txt;
      break;
    }
  }
  // Fallback caso falhe
  if (!tagTema) tagTema = limpas[1] || limpas[0];

  // 5. Cria o Slug (Padrão JW)
  let s = tagTema;
  s = s.replace(/<[^>]+>/g, " ").replace(/[\u201C\u201D\u201E\u201F\u2033\u2036"']/g, "").replace(/[(){}\[\]<>]/g, " ");
  s = s.replace(/[.!,;:?/\\|_+=*&^%$#@~`—–]/g, " ").replace(/\s+/g, " ").trim();
  s = s.replace(/[^\p{L}\p{N}\s-]+/gu, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "");

  // 6. Monta a URL final da JW.org
  const ano = issue.slice(0, 4);
  const mesNum = issue.slice(4, 6);
  const meses = { "01": "janeiro", "02": "fevereiro", "03": "marco", "04": "abril", "05": "maio", "06": "junho", "07": "julho", "08": "agosto", "09": "setembro", "10": "outubro", "11": "novembro", "12": "dezembro" };
  const mesNome = meses[mesNum];

  return `https://www.jw.org/pt/biblioteca/revistas/sentinela-estudo-${mesNome}-${ano}/${s}/`;
}

// =========================================================================
// FUNÇÃO MÁGICA 2: CAÇA O HEX DO CSS (Lê o collector.css)
// =========================================================================
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

    // Acha o arquivo de Design System
    const collectorUrl = hrefs.find(u => /collector(\.|-)?[^/]*\.css/i.test(u)) || hrefs.find(u => /collector/i.test(u));

    if (collectorUrl) {
      const cssResp = await fetch(collectorUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/121.0.0.0 Safari/537.36" }
      });
      if (cssResp.ok) {
        const css = await cssResp.text();
        const esc = tokenClass.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // Escapa a classe
        
        // Exemplo: .jwac .du-bgColor--blue700 { background-color: #4a6b8c; }
        const bgHexRe = new RegExp("\\.jwac\\s+\\." + esc + "\\b[\\s\\S]*?\\{[\\s\\S]*?background-color\\s*:\\s*(#[0-9a-fA-F]{3,8})\\b[\\s\\S]*?\\}", "i");
        let bgM = css.match(bgHexRe);
        if (bgM && bgM[1]) return bgM[1];

        // Backup regex
        const fbg = css.match(new RegExp("\\." + esc + "\\b[\\s\\S]*?\\{[\\s\\S]*?background-color\\s*:\\s*(#[0-9a-fA-F]{3,8})\\b[\\s\\S]*?\\}", "i"));
        if (fbg && fbg[1]) return fbg[1];
      }
    }
  } catch (e) {
    return null; // Falha silenciosa
  }
  return null;
}

// =========================================================================
// FUNÇÕES UTILITÁRIAS E PROCESSADORES (HTML REWRITER)
// =========================================================================
function normalizeBlankLines(html) {
  let out = html.replace(/\r\n/g, "\n");
  out = out.replace(/[ \t]+\n/g, "\n");
  out = out.replace(/\n{3,}/g, "\n\n");
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

function stripTags(s) {
  return s.replace(/<[^>]+>/g, "");
}

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
    /<p\b[^>]*\bclass=(["'])[^"']*\bqu\b[^"']*\1[^>]*>\s*<strong[^>]*>\s*([\s\S]*?)\s*<\/strong>\s*([\s\S]*?)<\/p>/gi,
    (_m, _q, strongPart, rest) => {
      const num = stripTags(strongPart).replace(/\s+/g, " ").trim();
      const texto = preserveAllowedTags(rest);
      return `\n\n<pergunta>${(num ? num + " " : "") + texto}</pergunta>\n\n`;
    }
  );
}

// O PROCESSADOR 2 AGORA RECEBE A COR HEXADECIMAL!
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

  let i = openEnd;
  let depth = 1;
  while (i < out.length) {
    const nextOpen = out.slice(i).search(/<div\b/i);
    const nextClose = out.slice(i).search(/<\/div\s*>/i);
    if (nextClose < 0) break;

    if (nextOpen >= 0 && nextOpen < nextClose) {
      depth++; i += nextOpen + 4; continue;
    }

    depth--;
    const closeStart = i + nextClose;
    const closeEnd = closeStart + out.slice(closeStart).match(/<\/div\s*>/i)[0].length;

    if (depth === 0) {
      const inside = out.slice(openEnd, closeStart);
      const rest = out.slice(closeEnd);
      // Aqui nós injetamos o HEX no início do HTML
      const prefix = `${docId}\n\n${hexColor}\n\n`;
      return prefix + inside + rest;
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
  out = out.replace(/<p\b[^>]*>\s*<span\b[^>]*\bclass=(["'])[^"']*\bparNum\b[^"']*\1[^>]*\bdata-pnum=(["'])(\d+)\2[^>]*>[\s\S]*?<\/span>\s*([\s\S]*?)<\/p>/gi, (_m, _q1, _q2, num, restHtml) => {
    let rest = (restHtml || "").replace(/^\s+/, "").replace(/^\u00a0+/, "").replace(/\s+$/, "");
    return `<paragrafo>${num} ${rest}</paragrafo>`;
  });
  return out;
}

function PROCESSADOR_5(html) {
  let out = html.replace(/\r\n/g, "\n");
  out = out.replace(/<\/tema>\s*<\/header>[\s\S]*?(?=<div\b[^>]*\bid=(?:"|')tt8(?:"|')[^>]*>|<p\b[^>]*\bclass=(?:"|')[^"']*\bthemeScrp\b[^"']*(?:"|')[^>]*>)/i, "</tema>\n\n");
  out = out.replace(/<div\b[^>]*\bclass=(["'])[^"']*\bbodyTxt\b[^"']*\1[^>]*>/gi, "");
  
  const stripTagsExceptBbl = (s) => {
    let t = s.replace(/<\s*bbl\s*>/gi, "__BBL_OPEN__").replace(/<\s*\/\s*bbl\s*>/gi, "__BBL_CLOSE__");
    t = t.replace(/<[^>]+>/g, "");
    return t.replace(/__BBL_OPEN__/g, "<bbl>").replace(/__BBL_CLOSE__/g, "</bbl>");
  };

  out = out.replace(/<div\b[^>]*\bid=(?:"|')tt8(?:"|')[^>]*>[\s\S]*?<p\b[^>]*\bclass=(["'])[^"']*\bthemeScrp\b[^"']*\1[^>]*>([\s\S]*?)<\/p>[\s\S]*?<\/div>/i, (_m, _q, inner) => `<citacao>${stripTagsExceptBbl(inner).replace(/\s+/g, " ").trim()}</citacao>\n\n`);
  out = out.replace(/<div\b[^>]*\bid=(?:"|')tt11(?:"|')[^>]*>[\s\S]*?<p\b[^>]*>[\s\S]*?<strong[^>]*>\s*OBJETIVO\s*<\/strong>[\s\S]*?<\/p>\s*<p\b[^>]*>([\s\S]*?)<\/p>[\s\S]*?<\/div>/i, (_m, body) => `<objetivo>OBJETIVO\n\n${stripTags(body).replace(/\s+/g, " ").trim()}</objetivo>\n\n`);
  return out;
}

function PROCESSADOR_6(html) {
  let out = html.replace(/\r\n/g, "\n");
  out = out.replace(/<div\b[^>]*\bclass=(["'])[^"']*\bblockTeach\b[^"']*\1[^>]*>\s*<aside\b[^>]*>[\s\S]*?<\/aside>\s*<\/div>/gi, (m) => {
    const h2m = m.match(/<h2\b[^>]*>[\s\S]*?<\/h2>/i);
    const titulo = h2m ? stripTags(h2m[0]).replace(/\s+/g, " ").trim() : "";
    const itens = [];
    m.replace(/<li\b[^>]*>[\s\S]*?<p\b[^>]*>([\s\S]*?)<\/p>[\s\S]*?<\/li>/gi, (_mm, pInner) => {
      const t = stripTags(pInner).replace(/\s+/g, " ").trim();
      if (t) itens.push(t);
      return _mm;
    });
    if (!titulo && itens.length === 0) return m;
    return `\n\n<recap>${(titulo + itens.map(t => `\n\n• ${t}`).join("")).trim()}</recap>\n\n`;
  });

  out = out.replace(/<div\b[^>]*\bid=(["'])f\d+\1[^>]*>[\s\S]*?<figure\b[^>]*>[\s\S]*?<span\b[^>]*\bclass=(["'])[^"']*\bjsRespImg\b[^"']*\2[^>]*>[\s\S]*?<\/span>[\s\S]*?<figcaption\b[^>]*>[\s\S]*?<\/figcaption>[\s\S]*?<\/figure>[\s\S]*?<\/div>\s*(?:<hr\b[^>]*>\s*)?/gi, (m) => {
    const lgMatch = m.match(/\bdata-img-size-lg=(["'])(.*?)\1/i);
    const src = lgMatch ? lgMatch[2] : "";
    if (!src) return m;
    const pMatch = m.match(/<figcaption\b[^>]*>[\s\S]*?<p\b[^>]*>([\s\S]*?)<\/p>[\s\S]*?<\/figcaption>/i);
    if (!pMatch || !pMatch[1]) return m;
    let pInner = pMatch[1].replace(/<span\b[^>]*\bclass=(["'])[^"']*\brefID\b[^"']*\1[^>]*>[\s\S]*?<\/span>/gi, "").replace(/<a\b[^>]*\bclass=(["'])[^"']*\bfootnoteLink\b[^"']*\1[^>]*>[\s\S]*?<\/a>/gi, " * ");
    return `\n\n<figure>\n  <img src="${src}" />\n  <figcaption>\n    ${stripTags(pInner).replace(/\s+/g, " ").trim()}\n  </figcaption>\n</figure>\n\n`;
  });
  return out;
}

function PROCESSADOR_7(html) {
  let out = html.replace(/\r\n/g, "\n");
  out = out.replace(/<h2\b[^>]*\bclass=(["'])[^"']*\bdu-textAlign--center\b[^"']*\1[^>]*>[\s\S]*?<\/h2>/gi, (m) => {
    const txt = stripTags(m).replace(/\s+/g, " ").trim();
    return txt ? `\n\n<subtitulo>${txt}</subtitulo>\n\n` : m;
  });
  out = out.replace(/<div\b[^>]*\bclass=(["'])[^"']*\bdu-color--textSubdued\b[^"']*\1[^>]*>\s*<p\b[^>]*\bclass=(["'])[^"']*\bpubRefs\b[^"']*\2[^>]*>([\s\S]*?)<\/p>\s*<\/div>/gi, (m, _q1, _q2, inner) => {
    let s = (inner || "").replace(/<span\b[^>]*\bclass=(["'])[^"']*\brefID\b[^"']*\1[^>]*>[\s\S]*?<\/span>/gi, "").replace(/<a\b[^>]*>([\s\S]*?)<\/a>/gi, "$1");
    s = stripTags(s).replace(/\s+/g, " ").trim();
    if (!s || !/\bCÂNTICO\b/i.test(s)) return m;
    return `\n\n<cantico>${s}</cantico>\n\n`;
  });
  out = out.replace(/<div\b[^>]*\bclass=(["'])groupFootnote\1[^>]*>[\s\S]*?<\/div>\s*<\/div>/gi, (m) => {
    const pMatch = m.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i);
    if (!pMatch) return m;
    let inner = pMatch[1].replace(/<a\b[^>]*\bclass=(["'])fn-symbol\1[^>]*>[\s\S]*?<\/a>/i, "*");
    const note = inner.replace(/\s+/g, " ").trim();
    return note ? `\n\n<nota>${note}</nota>\n\n` : "";
  });
  out = out.replace(/<\/?article\b[^>]*>/gi, "");
  const lastNotaEnd = out.lastIndexOf("</nota>");
  if (lastNotaEnd !== -1) out = out.slice(0, lastNotaEnd + "</nota>".length) + "\n";
  return out;
}