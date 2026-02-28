export default {
  async fetch(request) {
    const params = new URL(request.url).searchParams;
    const target = params.get("url");

    if (!target) {
      return new Response("Parâmetro ?url= ausente.", { status: 400 });
    }

    let targetUrl;
    try {
      targetUrl = new URL(target);
    } catch {
      return new Response("URL inválida.", { status: 400 });
    }

    // Busca o conteúdo no site de destino
    const upstream = await fetch(targetUrl.toString(), {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ProxyBot/1.0)",
        "Accept": "text/html,application/xhtml+xml,*/*",
        "Accept-Language": "pt-BR,pt;q=0.9",
      },
      redirect: "follow",
    });

    // Lê o HTML
    let body = await upstream.text();

    // Reescreve URLs relativas para absolutas (CSS, JS, imagens, links)
    const base = targetUrl.origin;
    body = body
      .replace(/(href|src|action)="(?!https?:\/\/|\/\/|#|data:)([^"]*?)"/gi,
        (_, attr, path) => {
          const abs = path.startsWith("/")
            ? base + path
            : base + "/" + path;
          return `${attr}="${abs}"`;
        })
      // Links internos que seriam navegados → redireciona pro proxy
      .replace(/href="(https?:\/\/[^"]+)"/gi, (_, url) => {
        if (url.startsWith(base)) {
          return `href="/?url=${encodeURIComponent(url)}"`;
        }
        return `href="${url}"`;
      });

    // Copia os headers mas remove os que bloqueiam iframe
    const newHeaders = new Headers();
    for (const [key, value] of upstream.headers.entries()) {
      const lower = key.toLowerCase();
      if (
        lower === "x-frame-options" ||
        lower === "content-security-policy" ||
        lower === "content-security-policy-report-only" ||
        lower === "frame-options"
      ) {
        continue; // descarta
      }
      newHeaders.set(key, value);
    }

    // Garante que o iframe possa ser exibido
    newHeaders.set("Content-Type", "text/html; charset=utf-8");
    newHeaders.set("Access-Control-Allow-Origin", "*");

    return new Response(body, {
      status: upstream.status,
      headers: newHeaders,
    });
  },
};
