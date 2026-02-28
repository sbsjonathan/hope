export default {
async fetch(request) {
const corsHeaders = {
“Access-Control-Allow-Origin”: “*”,
“Access-Control-Allow-Methods”: “GET, OPTIONS”,
“Access-Control-Allow-Headers”: “Content-Type”,
};

 
if (request.method === "OPTIONS") {
  return new Response(null, { headers: corsHeaders });
}

const targetUrl = new URL(request.url).searchParams.get("url");

if (!targetUrl) {
  return new Response("Parâmetro ?url= ausente.", { status: 400, headers: corsHeaders });
}

try {
  const upstream = await fetch(targetUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,*/*;q=0.9",
      "Accept-Language": "pt-BR,pt;q=0.9",
    },
    redirect: "follow",
  });

  if (!upstream.ok) {
    return new Response(`Erro ao buscar página: ${upstream.status}`, { status: upstream.status, headers: corsHeaders });
  }

  const html = await upstream.text();

  // Extrai apenas o bloco <article id="article">
  const articleMatch = html.match(/<article\b[^>]*\bid=["']article["'][^>]*>([\s\S]*?)<\/article>/i);
  if (!articleMatch) {
    return new Response("Artigo não encontrado na página.", { status: 404, headers: corsHeaders });
  }

  const articleHtml = articleMatch[1];

  // Extrai o título (h1)
  const h1Match = articleHtml.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  const titulo = h1Match ? stripTags(h1Match[1]).replace(/\s+/g, " ").trim() : "";

  // Extrai parágrafos com número (parNum) — parágrafos numerados do estudo
  const paragrafos = [];
  const pNumRe = /<p\b[^>]*>[\s\S]*?<span\b[^>]*\bdata-pnum=(["'])(\d+)\1[^>]*>[\s\S]*?<\/span>([\s\S]*?)<\/p>/gi;
  let pm;
  while ((pm = pNumRe.exec(articleHtml)) !== null) {
    const num = pm[2];
    let inner = pm[3];
    // Remove notas de rodapé
    inner = inner.replace(/<span\b[^>]*\bclass=(["'])[^"']*\brefID\b[^"']*\1[^>]*>[\s\S]*?<\/span>\s*<a\b[^>]*\bclass=(["'])[^"']*\bfootnoteLink\b[^"']*\2[^>]*>[\s\S]*?<\/a>/gi, "");
    // Preserva referências bíblicas
    inner = inner.replace(/<a\b[^>]*\bclass=(["'])[^"']*\bjsBibleLink\b[^"']*\1[^>]*>([\s\S]*?)<\/a>/gi, (_, __, txt) => stripTags(txt).trim());
    const texto = stripTags(inner).replace(/\s+/g, " ").replace(/^\u00a0+/, "").trim();
    if (texto) paragrafos.push({ num, texto });
  }

  // Fallback: parágrafos simples se não houver numerados
  if (paragrafos.length === 0) {
    const pRe = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;
    let fallbackIdx = 1;
    let fm;
    while ((fm = pRe.exec(articleHtml)) !== null) {
      const texto = stripTags(fm[1]).replace(/\s+/g, " ").trim();
      if (texto && texto.length > 30) {
        paragrafos.push({ num: fallbackIdx++, texto });
      }
    }
  }

  // Monta JSON de resposta
  const resultado = { titulo, paragrafos };

  return new Response(JSON.stringify(resultado), {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json;charset=UTF-8",
      "Cache-Control": "public, max-age=3600", // cache de 1 hora no Cloudflare
    },
  });

} catch (err) {
  return new Response(`Erro no Worker: ${err.message}`, { status: 500, headers: corsHeaders });
}
 

},
};

function stripTags(s) {
return (s || “”).replace(/<[^>]+>/g, “”);
}