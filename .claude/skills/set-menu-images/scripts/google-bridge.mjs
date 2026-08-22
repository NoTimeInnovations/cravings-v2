/**
 * google-bridge.mjs — two-way bridge between local files and a google.com tab.
 *
 * Google Images has no server-rendered HTML and no free API, so the search has
 * to run inside a real browser tab. This moves the query list in and the results
 * out without either passing through the model's context.
 *
 *   GET /load  -> stages queries.json into window.name, so the search tab can
 *                 read them without pasting 34KB of JS through the model.
 *   GET /      -> reads window.name back and POSTs it here (results).
 *
 * window.name is the carrier because it survives cross-origin navigation, and a
 * page on google.com cannot POST to localhost (mixed content + private-network
 * preflight both block it).
 */
import http from "node:http";
import fs from "node:fs";

const QUERIES = process.argv[2] || "cl_queries.json";
const OUT = process.argv[3] || "cl_candidates.json";
const PORT = parseInt(process.argv[4] || "8899", 10);

http
  .createServer((req, res) => {
    if (req.method === "POST") {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        try {
          const o = JSON.parse(body);
          fs.writeFileSync(OUT, body);
          res.writeHead(200, { "content-type": "text/plain" });
          res.end(`SAVED ${Object.keys(o).length} entries, ${body.length} bytes`);
          console.log(`saved ${Object.keys(o).length} entries -> ${OUT}`);
        } catch (e) {
          res.writeHead(400, { "content-type": "text/plain" });
          res.end("BAD JSON: " + e.message);
        }
      });
      return;
    }

    if (req.url.startsWith("/load")) {
      const q = fs.readFileSync(QUERIES, "utf8");
      res.writeHead(200, { "content-type": "text/html" });
      res.end(`<!doctype html><title>load</title><body style="font:14px system-ui;padding:20px">
<pre id=o></pre>
<script>
  window.name = ${JSON.stringify(q)};
  document.getElementById('o').textContent =
    'staged ' + Object.keys(JSON.parse(window.name)).length + ' queries into window.name (' + window.name.length + ' bytes).\\n' +
    'Now navigate this tab to google.com and run the search.';
</script></body>`);
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
    if (!n) { o.textContent += '\\n(nothing staged)'; return; }
    const r = await fetch('/save', { method:'POST', headers:{'content-type':'application/json'}, body:n });
    o.textContent = 'RESULT: ' + (await r.text());
    window.name = '';
  })();
</script></body>`);
  })
  .listen(PORT, "127.0.0.1", () =>
    console.log(`bridge on ${PORT}\n  /load -> stage ${QUERIES}\n  /     -> save results to ${OUT}`)
  );
