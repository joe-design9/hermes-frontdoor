// Hermes front door: a permanent Cloudflare Worker address that proxies
// every request to the CURRENT Pinggy tunnel URL. The current URL is read
// from a pointer file in a public GitHub repo; Mochi's tunnel watchdog
// updates that file whenever the tunnel rotates. No secrets anywhere:
// knowing the pointer only reveals the current tunnel address, which is
// still protected by the Hermes dashboard login.
const POINTER = "https://raw.githubusercontent.com/joe-design9/hermes-frontdoor/main/current.txt";

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/healthz") {
      return new Response("ok", { status: 200 });
    }

    let base;
    try {
      const r = await fetch(POINTER, { cf: { cacheTtl: 0, cacheEverything: false } });
      if (!r.ok) throw new Error("pointer http " + r.status);
      base = (await r.text()).trim().replace(/\/$/, "");
      if (!base.startsWith("https://")) throw new Error("bad pointer content");
    } catch (e) {
      return new Response(
        "Hermes ist gerade kurz nicht erreichbar (der Tunnel wechselt). Bitte in 1-2 Minuten nochmal versuchen.",
        { status: 502, headers: { "content-type": "text/plain; charset=utf-8" } }
      );
    }

    const target = base + url.pathname + url.search;
    const init = { method: request.method, headers: request.headers, redirect: "manual" };
    if (request.method !== "GET" && request.method !== "HEAD") {
      init.body = request.body;
    }

    const resp = await fetch(target, init);

    // Rewrite headers that would leak the rotating tunnel address back to
    // the client: absolute redirects pointing at the tunnel host, and
    // cookies scoped to the tunnel domain.
    const headers = new Headers(resp.headers);
    const loc = headers.get("location");
    if (loc && loc.startsWith(base)) {
      headers.set("location", url.origin + loc.slice(base.length));
    }
    if (headers.has("set-cookie")) {
      const fixed = headers
        .getSetCookie()
        .map((c) => c.replace(/;\s*domain=[^;]*/i, ""));
      headers.delete("set-cookie");
      for (const c of fixed) headers.append("set-cookie", c);
    }
    return new Response(resp.body, {
      status: resp.status,
      statusText: resp.statusText,
      headers,
    });
  },
};
