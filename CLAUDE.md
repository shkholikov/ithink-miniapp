# CLAUDE.md — ithink-miniapp

Telegram Mini App for **ithink.uz** (B2B IT services company, Tashkent). Runs inside `@ithinkuzbot`. Purpose: lead generation for prospects.

## Monorepo

- **Manager:** pnpm + Turborepo
- **Structure:**
  - `apps/web` — Next.js 16 Mini App
  - `apps/bot` — grammY bot
  - `packages/config` — shared tsconfig, eslint, tailwind preset (brand tokens)
  - `packages/types` — zod schemas doubling as TS types
  - `packages/content` — typed service catalog, cases, FAQ
  - `packages/amocrm` — amoCRM REST client (stubbed in phase 1)

## Phase 1 scope (keep tight)

- 4 flows only: **browse services**, **request consultation**, **portfolio**, **FAQ + chat with sales**
- Target user: **prospects** (new leads), not existing clients
- **No database.** Content lives in `packages/content`. Leads go to amoCRM. Session is in-memory.
- **No admin panel** — phase 2.
- **amoCRM is stubbed** — `/api/lead` validates initData, logs payload via pino, returns fake `leadId`. Real API integration lands when credentials are provided.

## Design rules

- Brand colors and typography come **entirely from `/Users/shakhzodkholikov/Desktop/ithink-web/app/globals.css`** — do not introduce new colors. Copy `globals.css` lines 38–213 verbatim.
- Primary: `#377dff`. Bg: `#0d0d14`. Card: `#13131f`. Font: Inter.
- Visual language matches @Wallet and @BotFather mini apps:
  - Pure near-black background
  - Grouped iOS-style card lists (single rounded container + hairline dividers between rows)
  - Colored icon squares (~28–32px, 8px radius) per row
  - Floating pill-shaped bottom nav with blue glow under active tab
  - Top chrome: Close/Back pill top-left, title center, `⋯` top-right
  - Pill-shaped full-width CTAs
- Reuse existing utilities from `globals.css`: `glass-card`, `noise-bg`, `animate-blob`, `gradient-text`, `gradient-text-blue`, `animate-marquee`

## Telegram Mini App integration

- Use `window.Telegram.WebApp` directly (thin utility wrappers in `apps/web/src/lib/telegram/`). Do not add a heavy SDK abstraction.
- **HMAC-validate `initData`** on every `/api/*` route that accepts user input. Reject if invalid or `auth_date` older than 1 hour.
- Theme: sync `WebApp.colorScheme` → `next-themes`. Default dark.
- Haptics on meaningful interactions (`impactOccurred('light')` on tab change, `notificationOccurred('success')` on lead submit).
- Use `BackButton` for sub-pages, `MainButton` for primary CTAs on `/request` and `/services/[slug]`.

## Bot (`@ithinkuzbot`)

- Already exists in BotFather — **do not create a new bot**. Reuse the existing one.
- Handoff flow = Telegram forum-topic supergroup, one topic per user, created lazily. No ticketing DB.
- Bot exposes a minimal `/internal/notify` endpoint (shared-secret) called by `apps/web` after successful lead submissions.

## Localization

- Languages: `uz`, `ru`, `en`. Default: `ru`.
- First-visit auto-select: read `WebApp.initDataUnsafe.user.language_code`; fall back to `ru` if no match.
- `apps/web` uses `next-intl`; `apps/bot` uses grammY i18n plugin (Fluent `.ftl` files).

## Code style (from global CLAUDE.md)

- TypeScript strict mode
- Functional React components only
- `async/await` over `.then()`
- Zod for all boundary validation
- Small, focused functions
- No emojis in code or commits
- No unnecessary comments — default to none; only add a line when WHY is non-obvious
- Prefer editing existing files over creating new ones
- No feature flags or backwards-compat shims for features that haven't shipped yet
- Git commits: meaningful and descriptive; never push or force push without explicit user confirmation

## What NOT to do in phase 1

- Don't add Postgres, Redis, BullMQ, or any queue
- Don't build `packages/ui` (one consumer is not enough)
- Don't wire real amoCRM API — keep it stubbed until credentials land
- Don't implement amoCRM OAuth refresh
- Don't create a new Telegram bot — reuse `@ithinkuzbot`
- Don't invent new brand colors — everything comes from ithink-web

## Key reference files (outside this repo)

- `/Users/shakhzodkholikov/Desktop/ithink-web/app/globals.css` — source of truth for brand tokens and utilities
- `/Users/shakhzodkholikov/Desktop/ithink-web/public/logo.png` — primary logo
- `/Users/shakhzodkholikov/Desktop/ithink-web/public/logo-negative.png` — logo for light backgrounds
- `/Users/shakhzodkholikov/Desktop/ithink-web/i18n/routing.ts` + `/Users/shakhzodkholikov/Desktop/ithink-web/i18n/request.ts` — i18n template
- `/Users/shakhzodkholikov/Desktop/ithink-web/messages/{uz,ru,en}.json` — translation templates
