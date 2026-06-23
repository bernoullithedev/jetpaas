# Jetpaas

A learning project inspired by the [Brimble Fullstack / Infra Engineer](https://www.brimble.io/careers/fullstack-infra-engineer) take-home: a one-page deployment pipeline UI with an API, container builds (Railpack), and Caddy ingress.

This repo is for learning — not a job submission.

## What exists today

| Layer | Status |
|-------|--------|
| Monorepo (pnpm + Turbo) | Done |
| Web UI (Vite + TanStack Start/Router) | Scaffolded — deployment dashboard |
| API server (Express + BullMQ + Redis) | Partial — create/list deployments, SSE snapshots |
| Railpack builds | Not started |
| Docker runtime for user apps | Not started |
| Caddy reverse proxy | Not started |
| `docker compose up` full stack | Partial — Redis + API + Web only |

## Quick start (local dev)

```bash
# Terminal 1 — Redis
docker compose up redis

# Terminal 2 — apps
cp apps/server/.env.example apps/server/.env   # if needed
cp apps/web/.env.example apps/web/.env         # if needed
pnpm install
pnpm dev
```

- Web: http://localhost:3000
- API: http://localhost:4000

## Quick start (Docker full stack)

```bash
docker compose up --build
```

## Assignment reference

Hard requirements from the Brimble brief:

1. End-to-end with `docker compose up` (frontend + backend + Caddy + pipeline)
2. Live log streaming over SSE or WebSocket (not polling)
3. Railpack builds (no handwritten Dockerfiles for user apps)
4. Caddy as single ingress point

