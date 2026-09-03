# Open Money — Market Data Backend

Stateless Node.js + Express backend for market data. Proxies Yahoo Finance (stocks/ETFs) with a short-lived in-memory cache. No personal data is persisted.

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | none | Liveness probe — `{ status: "ok" }` |
| GET | `/search?q=` | `X-API-Key` | Instrument search (Yahoo). Returns `{ results: [{ symbol, name, currency, market, isin, kind }] }` |
| GET | `/quote?symbols=A,B` | `X-API-Key` | Quotes via Yahoo chart API. Returns `{ quotes: [{ symbol, price, currency, variationPct, timestamp }], errors: [...] }` |

`variationPct` is `(price - previousClose) / previousClose * 100`, or `null` if unavailable. Failed symbols are returned in `errors` without failing the whole request.

`GET /search` and `GET /quote` require header `X-API-Key`. Missing or wrong key → `401 { error: "Invalid API key" }`. `/health` is public for Render probes and the app's connection test still sends the key.

Cache: in-memory TTL map (default 5 min, configurable via `CACHE_TTL_MS`). Only successful upstream responses are cached.

## Environment

| Var | Required | Default | Description |
|-----|----------|---------|-------------|
| `API_KEY` | yes | — | Static API key (long random string) |
| `PORT` | no | `3000` | Listen port |
| `CACHE_TTL_MS` | no | `300000` | Cache TTL in ms |

Copy `.env.example` to `.env` for local development:

```bash
cp .env.example .env
# edit API_KEY
pnpm --filter backend dev
```

## Local development

```bash
pnpm install
pnpm --filter backend dev      # tsx watch src/index.ts
pnpm --filter backend build    # tsc → dist/
pnpm --filter backend start    # node dist/index.js
pnpm --filter backend test
pnpm --filter backend lint
pnpm --filter backend typecheck
```

Smoke test:

```bash
curl http://localhost:3000/health
curl -H "X-API-Key: your-key" "http://localhost:3000/search?q=vanguard"
curl -H "X-API-Key: your-key" "http://localhost:3000/quote?symbols=AAPL,MSFT"
```

## Deployment on Render

1. The `render.yaml` file is already in the repository root (and also at `apps/backend/render.yaml`). In Render: **New → Blueprint** and connect the `open-money` repository. By default Render looks for `render.yaml` at the repo root; if you use the copy under `apps/backend`, set the Blueprint Path field to `apps/backend/render.yaml`.
2. Alternatively **New → Web Service**: Root directory `apps/backend`, Build `pnpm install && pnpm --filter backend build`, Start `node dist/index.js`, Health check path `/health`, Runtime Node 22.
3. Set environment variable `API_KEY` in the Render dashboard (Environment → Add, value is secret, `sync: false` in `render.yaml` means Render won't overwrite it from the file). Optionally set `CACHE_TTL_MS`.
4. Deploy. Once live, copy the public URL (e.g. `https://open-money-backend.onrender.com`).

## App configuration

In the mobile app: **Settings → Backend de datos de mercado** → paste the Render URL and the same `API_KEY` → **Guardar** → **Probar conexión**. Expected result: "Conexión correcta." The app sends `X-API-Key` on every market request and never sends personal data to the backend.
