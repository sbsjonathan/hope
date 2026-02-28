export default {
  async fetch(request) {
    const u = new URL(request.url);
    const target = u.searchParams.get("url");
    if (!target) return new Response("Missing url", { status: 400 });

    const resp = await fetch(target, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    const html = await resp.text();

    return new Response(html, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "access-control-allow-origin": "*"
      }
    });
  }
};