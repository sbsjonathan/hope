export default {
  async fetch(request, env, ctx) {
    return new Response("ok do hope (v1)", {
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  },
};
