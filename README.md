# ithink.uz Telegram Mini App

Telegram Mini App for **[ithink.uz](https://ithink.uz)** — a B2B IT services company in Tashkent. Runs inside `@ithinkuzbot` and gives prospects a native-feeling way to browse services, read case studies, submit consultation requests, and chat with sales.

## Monorepo structure

```
ithink-miniapp/
├── apps/
│   ├── web/          Next.js 16 Mini App (Vercel)
│   └── bot/          grammY Telegram bot (Railway / VPS)
└── packages/
    ├── config/       Shared tsconfig, eslint, tailwind preset
    ├── types/        Zod schemas + TS types (Lead, Service, Case, ...)
    ├── content/      Typed service catalog, cases, FAQ
    └── amocrm/       Thin amoCRM REST client (stubbed in phase 1)
```

## Stack

- **Monorepo:** pnpm workspaces + Turborepo
- **Mini app:** Next.js 16 (App Router) · Tailwind v4 · shadcn/ui · next-intl · Framer Motion · react-hook-form · zod
- **Bot:** grammY · Fastify · pino
- **Lead storage:** amoCRM (system of record; phase 1 ships stubbed)
- **Languages:** Uzbek, Russian (default), English
- **Containerization:** Docker · docker-compose

## Getting started

### Prerequisites

- Node.js ≥ 20.11
- pnpm ≥ 9
- Docker (optional, for containerized local dev)
- A Telegram bot token for `@ithinkuzbot` (from [@BotFather](https://t.me/BotFather))

### Install

```bash
pnpm install
```

### Configure env

```bash
cp .env.example apps/web/.env.local
cp .env.example apps/bot/.env
# Fill in BOT_TOKEN / TELEGRAM_BOT_TOKEN, OPERATOR_CHAT_ID, etc.
```

### Run (dev)

```bash
pnpm dev
```

This starts both apps in parallel via Turborepo:
- `apps/web` → http://localhost:3000
- `apps/bot` → http://localhost:3001

### Local Telegram testing

Telegram Mini Apps require HTTPS, so expose the web app via [ngrok](https://ngrok.com):

```bash
ngrok http 3000
```

Then in [@BotFather](https://t.me/BotFather):
1. Select `@ithinkuzbot` → **Mini Apps → New App** → URL = ngrok HTTPS URL
2. **Bot Settings → Menu Button** → label "Открыть ithink" → URL = ngrok HTTPS URL

Open Telegram on your phone, tap `@ithinkuzbot`, tap the menu button.

## Phase 1 scope

Lead generation for prospects: 4 flows (browse services, request consultation, portfolio, FAQ + chat with sales). No user accounts, no database. amoCRM integration is **stubbed** — the `/api/lead` endpoint logs payloads and returns a fake `leadId` until real credentials are provided.

## Phase 2 (planned)

- `apps/admin` Next.js admin panel (edit services/cases/FAQ in Postgres)
- Real amoCRM integration + OAuth refresh
- Leads audit trail in Postgres
- Push notifications for opt-in prospects

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Run all apps in dev mode |
| `pnpm build` | Build all apps and packages |
| `pnpm lint` | Lint everything |
| `pnpm typecheck` | TypeScript check everything |
| `pnpm test` | Run Jest tests |
| `pnpm clean` | Remove build artifacts and `node_modules` |
