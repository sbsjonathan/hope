export default {
  async fetch(request) {
    const url = new URL(request.url);
    const target = url.searchParams.get("url");

    if (!target) {
      return new Response(
        'Passe ?url=ENCODED_URL (ex: ?url=https%3A%2F%2Fwww.jw.org%2F...)',
        { status: 400, headers: cors() }
      );
    }

    let upstream;
    try {
      upstream = await fetch(target, {
        headers: {
          // ajuda a evitar bloqueios bobos
          "User-Agent":
            "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "pt-BR,pt;q=0.9",
        },
      });
    } catch (e) {
      return new Response("Falha no fetch do alvo.", { status: 502, headers: cors() });
    }

    const html = await upstream.text();

    // Por enquanto devolve o HTML bruto (depois a gente extrai titulo/paragrafos)
    return new Response(html, {
      headers: {
        ...cors(),
        "content-type": "text/html; charset=utf-8",
      },
    });
  },
};

function cors() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,HEAD,OPTIONS",
    "access-control-allow-headers": "*",
  };
}