# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.4.1 --activate
WORKDIR /app

FROM base AS pruner
COPY . .
RUN npx --yes turbo prune @jetpaas/server --docker

FROM base AS builder
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile
COPY --from=pruner /app/out/full/ .
RUN pnpm turbo build --filter=@jetpaas/server
RUN pnpm prune --prod

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 jetpaas
USER jetpaas
COPY --from=builder --chown=jetpaas:nodejs /app/apps/server/dist ./apps/server/dist
COPY --from=builder --chown=jetpaas:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=jetpaas:nodejs /app/apps/server/node_modules ./apps/server/node_modules
COPY --from=builder --chown=jetpaas:nodejs /app/apps/server/package.json ./apps/server/package.json
COPY --from=builder --chown=jetpaas:nodejs /app/package.json ./package.json
EXPOSE 4000
CMD ["node", "apps/server/dist/index.js"]
