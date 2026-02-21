// COLE SEU DICIONÁRIO BÍBLICO AQUI
const ABREV_BIBLIA = {
  "Gênesis": "Gên.",
  "Êxodo": "Êxo.",
  "Levítico": "Lev.",
  "Números": "Núm.",
  "Deuteronômio": "Deut.",
  "Josué": "Jos.",
  "Juízes": "Juí.",
  "Rute": "Rute",
  "1 Samuel": "1 Sam.",
  "2 Samuel": "2 Sam.",
  "1 Reis": "1 Reis",
  "2 Reis": "2 Reis",
  "1 Crônicas": "1 Crô.",
  "2 Crônicas": "2 Crô.",
  "Esdras": "Esd.",
  "Neemias": "Nee.",
  "Ester": "Est.",
  "Jó": "Jó",
  "Salmo": "Sal.",
  "Salmos": "Sal.",
  "Provérbios": "Pro.",
  "Eclesiastes": "Ecl.",
  "Cântico de Salomão": "Cânt.",
  "Isaías": "Isa.",
  "Jeremias": "Jer.",
  "Lamentações": "Lam.",
  "Ezequiel": "Eze.",
  "Daniel": "Dan.",
  "Oséias": "Osé.",
  "Joel": "Joel",
  "Amós": "Amós",
  "Obadias": "Oba.",
  "Jonas": "Jonas",
  "Miquéias": "Miq.",
  "Naum": "Naum",
  "Habacuque": "Hab.",
  "Sofonias": "Sof.",
  "Ageu": "Ageu",
  "Zacarias": "Zac.",
  "Malaquias": "Mal.",
  "Mateus": "Mat.",
  "Marcos": "Mar.",
  "Lucas": "Luc.",
  "João": "João",
  "Atos": "Atos",
  "Romanos": "Rom.",
  "1 Coríntios": "1 Cor.",
  "2 Coríntios": "2 Cor.",
  "Gálatas": "Gál.",
  "Efésios": "Efé.",
  "Filipenses": "Fil.",
  "Colossenses": "Col.",
  "1 Tessalonicenses": "1 Tes.",
  "2 Tessalonicenses": "2 Tes.",
  "1 Timóteo": "1 Tim.",
  "2 Timóteo": "2 Tim.",
  "Tito": "Tito",
  "Filemom": "Fil.",
  "Hebreus": "Heb.",
  "Tiago": "Tiago",
  "1 Pedro": "1 Ped.",
  "2 Pedro": "2 Ped.",
  "1 João": "1 João",
  "2 João": "2 João",
  "3 João": "3 João",
  "Judas": "Jud.",
  "Revelação": "Rev.",
  "Apocalipse": "Apo.",
  "Primeira Coríntios": "1 Cor.",
  "Segunda Coríntios": "2 Cor.",
  "Primeira Pedro": "1 Ped.",
  "Segunda Pedro": "2 Ped.",
  "Primeira Timóteo": "1 Tim.",
  "Segunda Timóteo": "2 Tim.",
  "Primeira Tessalonicenses": "1 Tes.",
  "Segunda Tessalonicenses": "2 Tes.",
  "Primeira João": "1 João",
  "Segunda João": "2 João",
  "Terceira João": "3 João",
};
// <<<DICIONARIO_BIBLICO_FIM>>>

export default {
  async fetch(request) {
    const urlParams = new URL(request.url).searchParams;
    const targetUrl =
      urlParams.get("arquivo") ||
      "https://akamd1.jw-cdn.org/sg2/p/35dc5d/1/o/w_T_202601_01.rtf";

    const response = await fetch(targetUrl);
    let texto = await response.text();

    texto = texto.replace(/\[Leitura do texto de\][\s\S]*?\[Fim da leitura\.?\]/gi, " ");
    texto = texto.replace(/\(\s*\*\s*\)/g, "§AST§");

    texto = texto.replace(/\\u(-?\d+)\?/g, (_, n) => {
      let code = parseInt(n, 10);
      if (code < 0) code = 65536 + code;
      return String.fromCharCode(code);
    });

    texto = texto.replace(/\\\'([0-9a-fA-F]{2})/g, (_, hex) => {
      const b = parseInt(hex, 16);
      return String.fromCharCode(b);
    });

    texto = texto.replace(/\s*\\\*+\s*HYPERLINK\s+"[^"]*"\s*/gi, " ");
    texto = texto.replace(/\s*\*+\s*HYPERLINK\s+"[^"]*"\s*/gi, " ");
    texto = texto.replace(/\s*HYPERLINK\s+"[^"]*"\s*/gi, " ");
    texto = texto.replace(/\s*"v\d+"\s*/gi, " ");
    texto = texto.replace(/\s*\*+\s*/g, " ");

    texto = texto.replace(/\{\\\*[^{}]*\}/g, " ");
    texto = texto.replace(/\{\\fonttbl[\s\S]*?\}/gi, " ");
    texto = texto.replace(/\{\\colortbl[\s\S]*?\}/gi, " ");
    texto = texto.replace(/\{\\stylesheet[\s\S]*?\}/gi, " ");
    texto = texto.replace(/\{\\info[\s\S]*?\}/gi, " ");
    texto = texto.replace(/\{\\pict[\s\S]*?\}/gi, " ");

    texto = texto.replace(/\\par(?![a-zA-Z])/g, "\n");
    texto = texto.replace(/\\line(?![a-zA-Z])/g, "\n");
    texto = texto.replace(/\\tab(?![a-zA-Z])/g, " ");
    texto = texto.replace(/\\[a-zA-Z]+\d*(?:-\d+)?\s?/g, " ");
    texto = texto.replace(/[{}]/g, " ");
    texto = texto.replace(/\\+/g, " ");

    texto = texto.replace(
      /(?:^|\n)\s*(?:WTS\d+|Latha|Arial|Heading\s*\d+)(?:\s*;\s*(?:WTS\d+|Latha|Arial|Heading\s*\d+))*\s*;\s*/gim,
      "\n"
    );
    texto = texto.replace(/^\s*;\s*/gm, "");

    texto = texto.replace(/\b(\d(?:\s+\d)+)\b/g, (m) => m.replace(/\s+/g, ""));

    texto = texto
      .split("\n")
      .map((l) => l.replace(/^\s+/g, "").replace(/\s+$/g, ""))
      .join("\n");

    texto = texto.replace(/[ \t]{2,}/g, " ");
    texto = texto.trim();

    texto = texto.replace(/\n?(\s*§AST§\s*)\n?/g, " (*) ");
    texto = texto.replace(/\n{3,}/g, "\n\n");

    // guarda um "finalTxt" (seu código usa isso nos processadores)
    let finalTxt = texto;

    // =====================================================================================
    // >>>PROCESSADOR_3_BIBLIA_INICIO<<<
    // =====================================================================================
    {
      const normSpaces = (s) => s.replace(/\s+/g, " ").trim();
      const normalizeOrdinalPrefix = (s) =>
        s
          .replace(/\bPrimeir[ao]\b/gi, "1")
          .replace(/\bSegund[ao]\b/gi, "2")
          .replace(/\bTerceir[ao]\b/gi, "3");

      const juntarDigitosSeparados = (s) => s.replace(/(\d)\s+(?=\d)/g, "$1");
      const limparEspacosPontuacao = (s) =>
        s
          .replace(/\s+([,.;:!?])/g, "$1")
          .replace(/\(\s+/g, "(")
          .replace(/\s+\)/g, ")")
          .replace(/\s{2,}/g, " ")
          .trim();

      const abreviarLivroNome = (livroCru) => {
        const n = normSpaces(normalizeOrdinalPrefix(livroCru));
        return ABREV_BIBLIA[n] || n;
      };

      const formatarVersosPorExtenso = (t) => {
        t = t.replace(/\b(\d+)\s+versículos?\s+(\d+)\s+a\s+(\d+)\b/gi, "$1:$2-$3");
        t = t.replace(/\b(\d+)\s+versículos?\s+(\d+)\b/gi, "$1:$2");
        t = t.replace(/\b(\d+):(\d+)\s+a\s+(\d+):(\d+)\b/gi, "$1:$2-$3:$4");
        return t;
      };

      const ajustarListaComA = (t) =>
        t.replace(/(\d+:\d+(?:,\d+)+)\s+a\s+(\d+)\b/g, (m, lista, fim) => {
          const parts = lista.split(":");
          if (parts.length !== 2) return m;
          const cap = parts[0];
          const vs = parts[1].split(",").map((x) => x.trim()).filter(Boolean);
          if (!vs.length) return m;
          const last = vs[vs.length - 1];
          return `${cap}:${vs.slice(0, -1).join(",")},${last}-${parseInt(fim, 10)}`;
        });

      const padronizarVirgulasEmRefs = (t) => {
        t = t.replace(/\b(\d+:\d+(?:\s*,\s*\d+)+)(?!\s*:\d)/g, (m, lista) => lista.replace(/\s*,\s*/g, ", "));
        t = t.replace(/\b(\d+:\d+(?:\s*,\s*\d+)*-\d+)(?!\s*:\d)/g, (m, r) => r.replace(/\s*,\s*/g, ", "));
        t = t.replace(/\b(\d+:\d+-\d+:\d+)(?!\s*:\d)/g, (m, r) => r.replace(/\s*,\s*/g, ", "));
        return t;
      };

      const abreviarReferenciasNoTrecho = (trecho) => {
        let t = ` ${trecho} `;
        t = juntarDigitosSeparados(t);
        t = normalizeOrdinalPrefix(t);
        t = formatarVersosPorExtenso(t);
        t = ajustarListaComA(t);

        // ===== PATCH 1 =====
        // "Capítulo X:YY" sem nome do livro (continua do livro anterior na mesma frase/lista)
        t = t.replace(/\bcap[íi]tulo\s+(\d+)\s*:\s*(\d+(?:\s*,\s*\d+)*)\b/gi, (_, cap, lista) => {
          const c = parseInt(cap, 10);
          const lst = lista.replace(/\s+/g, "");
          return `${c}:${lst}`.replace(/,(?=\d)/g, ", ");
        });

        // "Capítulo X versículo(s) Y" sem livro
        t = t.replace(/\bcap[íi]tulo\s+(\d+)\s+vers[íi]culo\s+(\d+)\b/gi, (_, cap, v) => `${parseInt(cap, 10)}:${parseInt(v, 10)}`);
        t = t.replace(/\bcap[íi]tulo\s+(\d+)\s+vers[íi]culos?\s+(\d+)\s+a\s+(\d+)\b/gi, (_, cap, v1, v2) => `${parseInt(cap, 10)}:${parseInt(v1, 10)}-${parseInt(v2, 10)}`);
        t = t.replace(/\bcap[íi]tulo\s+(\d+)\s+vers[íi]culos?\s+(\d+(?:\s*,\s*\d+)*)\b/gi, (_, cap, lista) => {
          const c = parseInt(cap, 10);
          const lst = lista.replace(/\s+/g, "");
          return `${c}:${lst}`.replace(/,(?=\d)/g, ", ");
        });
        // ===== /PATCH 1 =====

        t = t.replace(
          /((?:[1-3]\s+)?[A-Za-zÀ-ÿçÇ]+(?:\s+de\s+[A-Za-zÀ-ÿçÇ]+)*)\s+cap[íi]tulo\s+(\d+)\s+vers[íi]culo\s+(\d+)/gi,
          (_, livro, cap, v) => `${abreviarLivroNome(livro)} ${parseInt(cap, 10)}:${parseInt(v, 10)}`
        );

        t = t.replace(
          /((?:[1-3]\s+)?[A-Za-zÀ-ÿçÇ]+(?:\s+de\s+[A-Za-zÀ-ÿçÇ]+)*)\s+cap[íi]tulo\s+(\d+)\s+vers[íi]culos?\s+(\d+)\s+a\s+(\d+)/gi,
          (_, livro, cap, v1, v2) =>
            `${abreviarLivroNome(livro)} ${parseInt(cap, 10)}:${parseInt(v1, 10)}-${parseInt(v2, 10)}`
        );

        t = t.replace(
          /((?:[1-3]\s+)?[A-Za-zÀ-ÿçÇ]+(?:\s+de\s+[A-Za-zÀ-ÿçÇ]+)*)\s+cap[íi]tulo\s+(\d+)\s+vers[íi]culos?\s+(\d+(?:\s*,\s*\d+)*)/gi,
          (_, livro, cap, lista) => `${abreviarLivroNome(livro)} ${parseInt(cap, 10)}:${lista.replace(/\s+/g, "")}`
        );

        t = t.replace(
          /((?:[1-3]\s+)?[A-Za-zÀ-ÿçÇ]+(?:\s+de\s+[A-Za-zÀ-ÿçÇ]+)*)\s+cap[íi]tulo\s+(\d+)\s*:\s*(\d+(?:\s*,\s*\d+)*)\s+a\s*(\d+)/gi,
          (_, livro, cap, lista, fim) => {
            const L = abreviarLivroNome(livro);
            const c = parseInt(cap, 10);
            const vs = lista.replace(/\s+/g, "").split(",").filter(Boolean);
            if (!vs.length) return `${L} ${c}:${parseInt(fim, 10)}`;
            const last = vs[vs.length - 1];
            return `${L} ${c}:${vs.slice(0, -1).join(",")},${last}-${parseInt(fim, 10)}`;
          }
        );

        t = t.replace(
          /((?:[1-3]\s+)?[A-Za-zÀ-ÿçÇ]+(?:\s+de\s+[A-Za-zÀ-ÿçÇ]+)*)\s+cap[íi]tulo\s+(\d+)\s*:\s*(\d+(?:\s*,\s*\d+)*)/gi,
          (_, livro, cap, lista) => `${abreviarLivroNome(livro)} ${parseInt(cap, 10)}:${lista.replace(/\s+/g, "")}`
        );

        t = t.replace(
          /((?:[1-3]\s+)?[A-Za-zÀ-ÿçÇ]+(?:\s+de\s+[A-Za-zÀ-ÿçÇ]+)*)\s+cap[íi]tulo\s+(\d+)(?!\s*:\s*\d)/gi,
          (_, livro, cap) => `${abreviarLivroNome(livro)} ${parseInt(cap, 10)}`
        );

        const refRegex =
          /((?:[1-3]\s+)?[A-Za-zÀ-ÿçÇ]+(?:\s+de\s+[A-Za-zÀ-ÿçÇ]+)*)\s+(\d+:\d+(?:[-–]\d+)?(?:,\s*\d+)*)/g;

        t = t.replace(refRegex, (m, livro, ref) => `${abreviarLivroNome(livro)} ${ref.replace(/\s+/g, "")}`);

        t = padronizarVirgulasEmRefs(t);

        return limparEspacosPontuacao(normSpaces(t));
      };

      const aplicarAbreviacaoSoNosParenteses = (txt) =>
        txt.replace(/\(([\n()]*)\)/g, (m, dentro) => `(${abreviarReferenciasNoTrecho(dentro)})`);

      const aplicarAbreviacaoAposTravessao = (txt) =>
        txt.replace(/—\s*([^\n.]+)\./g, (m, trecho) => `— ${abreviarReferenciasNoTrecho(trecho)}.`);

      const aplicarAbreviacaoGlobalQuandoTiverCap = (txt) =>
        txt.replace(
          /((?:[1-3]\s+)?[A-Za-zÀ-ÿçÇ]+(?:\s+de\s+[A-Za-zÀ-ÿçÇ]+)*)\s+cap[íi]tulo\s+\d+[^\n]*/gi,
          (m) => abreviarReferenciasNoTrecho(m)
        );

      // ===== PATCH 2 =====
      // Fora de parênteses: numerar "Primeira/Primera/Segunda/Terceira" quando for LIVRO bíblico,
      // mas manter o nome por extenso (ex.: "1 Pedro", não "1 Ped.").
      const aplicarNumeracaoLivroPorExtenso = (txt) => {
        const re1 = /\b(?:prim(?:e)?ir[ao]|primera)\s+(Samuel|Reis|Crônicas|Coríntios|Pedro|João|Timóteo|Tessalonicenses)\b/gi;
        const re2 = /\b(?:segund[ao]|segunda)\s+(Samuel|Reis|Crônicas|Coríntios|Pedro|João|Timóteo|Tessalonicenses)\b/gi;
        const re3 = /\b(?:terceir[ao]|terceira)\s+(João)\b/gi;
        return txt
          .replace(re1, (_, livro) => `1 ${livro}`)
          .replace(re2, (_, livro) => `2 ${livro}`)
          .replace(re3, (_, livro) => `3 ${livro}`);
      };
      // ===== /PATCH 2 =====

      finalTxt = aplicarAbreviacaoSoNosParenteses(finalTxt);
      finalTxt = aplicarAbreviacaoAposTravessao(finalTxt);
      finalTxt = aplicarAbreviacaoGlobalQuandoTiverCap(finalTxt);
      finalTxt = aplicarNumeracaoLivroPorExtenso(finalTxt);

      // remove espaço logo após "(" e logo antes de ")"
finalTxt = finalTxt.replace(/\(\s+/g, "(");
finalTxt = finalTxt.replace(/\s+\)/g, ")");
    }
    // =====================================================================================
    // >>>PROCESSADOR_3_BIBLIA_FIM<<<
    // ======================================

    // COLE O PROCESSADOR 4 (TAGS) AQUI
    // >>>PROCESSADOR_4_TAGS_INICIO<<<
{
  const normSpaces = (s) => s.replace(/\s+/g, " ").trim();

  const bullets = (s) =>
    s.replace(
      /^[\uF000-\uF8FF\u2022\u25CF\u25AA\u25A0\u25E6\u2043\u2219\u00B7]+\s*/u,
      "• "
    );

  const notas = [];
  finalTxt = finalTxt.replace(/\[Nota\]([\s\S]*?)\[Fim da nota\.?\]/gi, (_, conteudo) => {
    let linhasNota = conteudo
      .split(/\n+/)
      .map((l) => l.trim())
      .filter(Boolean);

    const token = `§NOTA${notas.length}§`;
    notas.push(`<nota>${linhasNota.join("\n\n")}</nota>`);
    return `\n${token}\n`;
  });

  const imagens = [];
  finalTxt = finalTxt.replace(
    /\[Imagem:\]\s*([\s\S]*?)Legenda:\s*([\s\S]*?)(?=\n{2,}\S|$)/gi,
    (_, desc, leg) => {
      const descFmt = desc
        .replace(/\r/g, "")
        .split(/\n+/)
        .map((l) => l.trim())
        .filter(Boolean)
        .join("\n\n");

      const legFmt = leg
        .replace(/\r/g, "")
        .split(/\n+/)
        .map((l) => l.trim())
        .filter(Boolean)
        .join("\n\n");

      const token = `§IMAGEM${imagens.length}§`;
      imagens.push(`<imagem>${descFmt}\n\nLegenda: ${legFmt}</imagem>`);
      return `\n${token}\n`;
    }
  );

  let quadrosEncontrados = [];
  finalTxt = finalTxt.replace(/\[Quadro\]([\s\S]*?)\[Fim do quadro\.?\]/gi, (_, conteudo) => {
    quadrosEncontrados.push(conteudo.trim());
    return "";
  });

  let tagObjetivo = "";
  let tagRecap = "";

  if (quadrosEncontrados.length > 0) {
    if (quadrosEncontrados[0].toLowerCase().includes("objetivo")) {
      let conteudo = quadrosEncontrados[0].replace(/\n{2,}/g, " ").trim();
      conteudo = conteudo.replace(/^Objetivo\s+/i, "");
      tagObjetivo = `<objetivo>Objetivo\n${normSpaces(conteudo)}</objetivo>`;

      if (quadrosEncontrados.length > 1) {
        let conteudoRecap = quadrosEncontrados[quadrosEncontrados.length - 1];
        let linhas = conteudoRecap
          .split(/\n+/)
          .map((l) => l.trim())
          .filter(Boolean)
          .map(bullets);
        tagRecap = `<recap>${linhas.join("\n\n")}</recap>`;
      }
    } else {
      let conteudoRecap = quadrosEncontrados[quadrosEncontrados.length - 1];
      let linhas = conteudoRecap
        .split(/\n+/)
        .map((l) => l.trim())
        .filter(Boolean)
        .map(bullets);
      tagRecap = `<recap>${linhas.join("\n\n")}</recap>`;
    }
  }

  let limpas = finalTxt
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => l.length >= 2)
    .map((l) => normSpaces(l.replace(/Copyright\s*©.*?Pennsylvania/gi, "")))
    .filter(Boolean);

  if (limpas.length > 0) {
    const primeiraLinha = limpas.shift();
    const mTitulo = primeiraLinha.match(
      /(\d{1,2}(?:[-–]\d{1,2})?\s+de\s+[A-Za-zÀ-ÿçÇ]+?\s+de\s+\d{4})\s*:\s*(.+)/i
    );

    let tagEstudo = "";

    if (mTitulo) {
      const dataExtraida = mTitulo[1];
      tagEstudo = `<estudo>${dataExtraida.toUpperCase()}</estudo>`;
    } else {
      tagEstudo = `<estudo>${primeiraLinha.toUpperCase()}</estudo>`;
    }

    let tagCanticoTopo = "";
    let tagCanticoFinal = "";
    let tagTema = "";
    let tagCitacao = "";
    const corpoProcessado = [];
    const notasNoCorpo = [];

    for (let i = 0; i < limpas.length; i++) {
      let txt = limpas[i];

      const mNota = txt.match(/^§NOTA(\d+)§$/);
      if (mNota) {
        const n = parseInt(mNota[1], 10);
        if (notas[n]) notasNoCorpo.push(notas[n]);
        continue;
      }

      const mImg = txt.match(/^§IMAGEM(\d+)§$/);
      if (mImg) {
        const n = parseInt(mImg[1], 10);
        if (imagens[n]) corpoProcessado.push(imagens[n]);
        continue;
      }

      if (/^c[âa]ntico\b/i.test(txt)) {
        if (!tagCanticoTopo) tagCanticoTopo = `<cantico>${txt}</cantico>`;
        else tagCanticoFinal = `<cantico>${txt}</cantico>`;
        continue;
      }

      if (!tagTema && tagCanticoTopo && !/^pergunta\s+\d+/i.test(txt) && !/^\d+\s+/.test(txt)) {
        tagTema = `<tema>${txt}</tema>`;
        continue;
      }

      if (
        !tagCitacao &&
        tagTema &&
        (txt.includes("'") || txt.includes("\u2019") || txt.includes("\u201C") || txt.includes('"')) &&
        txt.includes("—")
      ) {
        tagCitacao = `<citacao>${txt}</citacao>`;
        continue;
      }

      if (/^pergunta\s+\d+/i.test(txt)) {
        let num = txt.replace(/^pergunta\s+/i, "").replace(/^(\d+)\s+(?:a|e)\s+(\d+)/, "$1-$2");
        corpoProcessado.push(`<pergunta>${num}</pergunta>`);
        continue;
      }

      if (/^\d+\s+/.test(txt)) {
        corpoProcessado.push(`<paragrafo>${txt}</paragrafo>`);
        continue;
      }

      const proximo = limpas[i + 1] || "";
      if (
        /^pergunta\s+\d+/i.test(proximo) &&
        corpoProcessado.length > 0 &&
        /^<paragrafo>/.test(corpoProcessado[corpoProcessado.length - 1]) &&
        txt.length <= 140
      ) {
        corpoProcessado.push(`<subtitulo>${txt}</subtitulo>`);
        continue;
      }

      corpoProcessado.push(txt);
    }

    const resultadoFinal = [];
    if (tagEstudo) resultadoFinal.push(tagEstudo);
    if (tagCanticoTopo) resultadoFinal.push(tagCanticoTopo);
    if (tagTema) resultadoFinal.push(tagTema);
    if (tagCitacao) resultadoFinal.push(tagCitacao);
    if (tagObjetivo) resultadoFinal.push(tagObjetivo);

    resultadoFinal.push(...corpoProcessado);

    if (tagRecap) resultadoFinal.push(tagRecap);
    if (tagCanticoFinal) {
      resultadoFinal.push(tagCanticoFinal);
      if (notasNoCorpo.length) resultadoFinal.push(...notasNoCorpo);
    } else {
      if (notasNoCorpo.length) resultadoFinal.push(...notasNoCorpo);
    }

    finalTxt = resultadoFinal.join("\n\n");
  }
}

    // >>>PROCESSADOR_4_TAGS_FIM<<<

    // >>>PROCESSADOR_5_TEMA_SLUG_INICIO<<<
{
  const urlParams = new URL(request.url).searchParams;

  const issueFromQuery = (urlParams.get("issue") || "").trim().replace(/[^\d]/g, "");
  const arquivoParam = urlParams.get("arquivo") || "";
  const mIssueFromArquivo = arquivoParam.match(/w_T_(\d{6})_\d{2}\.rtf/i);

  const issue = (issueFromQuery && issueFromQuery.length === 6)
    ? issueFromQuery
    : (mIssueFromArquivo ? mIssueFromArquivo[1] : "");

  const mTema = finalTxt.match(/<tema>([\s\S]*?)<\/tema>/i);

  if (mTema) {
    let s = mTema[1];

    s = s.replace(/<[^>]+>/g, " ");
    s = s.replace(/[\u201C\u201D\u201E\u201F\u2033\u2036"]/g, "");
    s = s.replace(/[\u2018\u2019\u201A\u201B\u2032\u2035']/g, "");
    s = s.replace(/[(){}\[\]<>]/g, " ");
    s = s.replace(/[.!,;:?/\\|_+=*&^%$#@~`]/g, " ");
    s = s.replace(/—|–/g, " ");
    s = s.replace(/\s+/g, " ").trim();

    s = s
      .replace(/[^\p{L}\p{N}\s-]+/gu, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "");

    if (s) {
      finalTxt = finalTxt.trim() + "\n\n" + s;

      if (issue && issue.length === 6) {
        const ano = issue.slice(0, 4);
        const mesNum = issue.slice(4, 6);

        const meses = {
          "01": "janeiro",
          "02": "fevereiro",
          "03": "marco",
          "04": "abril",
          "05": "maio",
          "06": "junho",
          "07": "julho",
          "08": "agosto",
          "09": "setembro",
          "10": "outubro",
          "11": "novembro",
          "12": "dezembro",
        };

        const mesNome = meses[mesNum] || "";

        if (mesNome) {
          const link =
            `https://www.jw.org/pt/biblioteca/revistas/` +
            `sentinela-estudo-${mesNome}-${ano}/` +
            `${s}/`;

          finalTxt = finalTxt.trim() + "\n\n" + link;
        }
      }
    }
  }
}
// >>>PROCESSADOR_5_TEMA_SLUG_FIM<<<

// >>>PROCESSADOR_6_INSIGHT_ID_INICIO<
let linkJwOrgParaModulo7 = null; // <-- variável compartilhada com módulo 7

{
  const linhasFinais = finalTxt.trimEnd().split("\n");
  const ultimaLinha = linhasFinais[linhasFinais.length - 1].trim();

  const isJwLink = /^https:\/\/www\.jw\.org\//i.test(ultimaLinha);

  if (isJwLink) {
    linkJwOrgParaModulo7 = ultimaLinha; // <-- salva antes de sobrescrever

    try {
      const resInsight = await fetch(ultimaLinha, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
          "Cache-Control": "no-cache",
          "Pragma": "no-cache",
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "none",
          "Upgrade-Insecure-Requests": "1"
        }
      });

      if (resInsight.ok) {
        const html = await resInsight.text();
        const match = html.match(/data-insight-context-id="pa-(\d+)"/);
        if (match && match[1]) {
          const id = match[1];
          const imgLink = `https://cms-imgp.jw-cdn.org/img/p/${id}/univ/art/${id}_univ_cnt_<>_xl.jpg`;
          finalTxt = finalTxt.replace(/\n\n[^\n]+\n\n[^\n]+$/, "").trimEnd() + "\n\n" + imgLink;
        }
      }
    } catch (e) {
      // silencia erro
    }
  }
}
// >>>PROCESSADOR_6_INSIGHT_ID_FIM<

// >>>PROCESSADOR_7_HEX_COR_INICIO<
{
  if (linkJwOrgParaModulo7) {
    try {
      const H_HTML = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Upgrade-Insecure-Requests": "1"
      };

      const H_CSS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Accept": "text/css,*/*;q=0.1",
        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache"
      };

      const resp = await fetch(linkJwOrgParaModulo7, { headers: H_HTML });

      if (resp.ok) {
        const html = await resp.text();

        // Aproveita o HTML que o módulo 6 já buscou seria ideal,
        // mas como não está salvo, buscamos novamente aqui.

        const tokenMatch = html.match(/\bdu-bgColor--[a-z0-9-]+\b/i);
        if (tokenMatch) {
          const token = tokenMatch[0];

          const baseMatch = html.match(/<base\b[^>]*href\s*=\s*["']([^"']+)["']/i);
          const baseHref = baseMatch ? baseMatch[1] : linkJwOrgParaModulo7;

          const hrefs = [];
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

          const seen = new Set();
          const cssUrls = hrefs.filter(u => (seen.has(u) ? false : (seen.add(u), true)));

          const collectorUrl =
            cssUrls.find(u => /collector(\.|-)?[^/]*\.css/i.test(u)) ||
            cssUrls.find(u => /collector/i.test(u)) ||
            null;

          if (collectorUrl) {
            const cssResp = await fetch(collectorUrl, { headers: H_CSS });
            if (cssResp.ok) {
              const css = await cssResp.text();
              const esc = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

              const bgHexRe = new RegExp(
                "\\.jwac\\s+\\." + esc + "\\b[\\s\\S]*?\\{[\\s\\S]*?background-color\\s*:\\s*(#[0-9a-fA-F]{3,8})\\b[\\s\\S]*?\\}",
                "i"
              );
              const colorHexRe = new RegExp(
                "\\.jwac\\s+\\." + esc + "\\b[\\s\\S]*?\\{[\\s\\S]*?color\\s*:\\s*(#[0-9a-fA-F]{3,8})\\b[\\s\\S]*?\\}",
                "i"
              );

              let hex = null;
              const bgM = css.match(bgHexRe);
              if (bgM && bgM[1]) {
                hex = bgM[1];
              } else {
                const cM = css.match(colorHexRe);
                if (cM && cM[1]) hex = cM[1];
              }

              if (!hex) {
                const fbg = css.match(new RegExp("\\." + esc + "\\b[\\s\\S]*?\\{[\\s\\S]*?background-color\\s*:\\s*(#[0-9a-fA-F]{3,8})\\b[\\s\\S]*?\\}", "i"));
                if (fbg && fbg[1]) hex = fbg[1];
                else {
                  const fco = css.match(new RegExp("\\." + esc + "\\b[\\s\\S]*?\\{[\\s\\S]*?color\\s*:\\s*(#[0-9a-fA-F]{3,8})\\b[\\s\\S]*?\\}", "i"));
                  if (fco && fco[1]) hex = fco[1];
                }
              }

              if (hex) {
                finalTxt = finalTxt.trimEnd() + "\n\n" + hex;
              }
            }
          }
        }
      }
    } catch (e) {
      // silencia erro, não quebra o resultado
    }
  }
}
// >>>PROCESSADOR_7_HEX_COR_FIM<

    finalTxt = finalTxt.replace(/§AST§/g, "*");

    return new Response(finalTxt, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
      },
    });
  },
};
