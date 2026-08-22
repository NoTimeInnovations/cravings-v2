#!/usr/bin/env node
/**
 * browser-sink.mjs — receive image candidates from the in-app browser.
 *
 * Only needed for BROWSER MODE (see SKILL.md), i.e. when DuckDuckGo rate-limits
 * the plain Node client and the search has to run inside a real browser tab.
 *
 * The candidate map is far too big to hand back through the model's context, and
 * a page on https://duckduckgo.com cannot POST to http://localhost (mixed
 * content + private-network preflight). `window.name` survives cross-origin
 * navigation, so the page stashes the JSON there and then navigates here, where
 * this server's own page reads it and POSTs it back same-origin.
 *
 * Usage:
 *   node browser-sink.mjs [outFile] [port]      # defaults: candidates.json 8899
 */

import http from "node:http";
import fs from "node:fs";

const OUT = process.argv[2] || "candidates.json";
const PORT = parseInt(process.argv[3] || "8899", 10);

http
  .createServer((req, res) => {
    if (req.method === "POST") {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        try {
          JSON.parse(body); // fail loudly rather than writing garbage
          fs.writeFileSync(OUT, body);
          res.writeHead(200, { "content-type": "text/plain" });
          res.end("SAVED " + body.length);
          console.log(`saved ${body.length} bytes -> ${OUT}`);
        } catch (e) {
          res.writeHead(400, { "content-type": "text/plain" });
          res.end("BAD JSON: " + e.message);
          console.error("rejected non-JSON payload:", e.message);
        }
      });
      return;
    }
    res.writeHead(200, { "content-type": "text/html" });
    res.end(`<!doctype html><title>sink</title><body style="font:14px system-ui;padding:20px">
<pre id=o>working...</pre>
<script>
  (async () => {
    const n = window.name || '';
    const o = document.getElementById('o');
    o.textContent = 'window.name bytes: ' + n.length;
    if (!n) { o.textContent += '\\n(nothing staged - set window.name on the search tab first)'; return; }
    const r = await fetch('/save', { method: 'POST', headers: { 'content-type': 'application/json' }, body: n });
    o.textContent = 'RESULT: ' + (await r.text());
    window.name = '';
  })();
</script></body>`);
  })
  .listen(PORT, "127.0.0.1", () =>
    console.log(`sink on ${PORT} -> ${OUT}\nNavigate the browser tab here after staging window.name.`)
  );
