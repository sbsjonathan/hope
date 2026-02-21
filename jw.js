export default {
  async fetch(request, env, ctx) {
    return new Response("ok do phope (v2)", {
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  },
};
