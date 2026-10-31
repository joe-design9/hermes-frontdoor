# hermes-frontdoor

A permanent address for the Hermes mobile app.

- `current.txt` holds the **current** Pinggy tunnel URL of the Hermes
  dashboard. Mochi's tunnel watchdog updates this file automatically
  whenever the tunnel rotates (about once an hour).
- A Cloudflare Worker (source: `worker.js`, deployed on Joel's Cloudflare
  account) reads this file and proxies every request to that address.
  The app only ever sees the fixed Worker address:
  `https://hermes.<account-subdomain>.workers.dev`

No secrets live in this repo. Knowing the current tunnel address is not
enough to access anything — the Hermes dashboard login still protects it.
