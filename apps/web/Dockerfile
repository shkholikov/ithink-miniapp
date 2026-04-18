FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /repo

FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY apps/web/package.json apps/web/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/content/package.json packages/content/package.json
COPY packages/amocrm/package.json packages/amocrm/package.json
RUN pnpm install --frozen-lockfile || pnpm install

FROM deps AS builder
COPY . .
RUN pnpm --filter @ithink/web build

FROM node:20-alpine AS runner
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /repo/apps/web/.next /app/.next
COPY --from=builder /repo/apps/web/public /app/public
COPY --from=builder /repo/apps/web/package.json /app/package.json
COPY --from=builder /repo/node_modules /app/node_modules
COPY --from=builder /repo/packages /app/packages
EXPOSE 3000
CMD ["pnpm", "start"]
