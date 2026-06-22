# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.4.1 --activate
WORKDIR /app

FROM base AS pruner
COPY . .
RUN npx --yes turbo prune @jetpaas/web --docker

FROM base AS builder
ARG VITE_API_URL=http://localhost:4000
ENV VITE_API_URL=$VITE_API_URL
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile
COPY --from=pruner /app/out/full/ .
RUN pnpm turbo build --filter=@jetpaas/web

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 jetpaas
USER jetpaas
COPY --from=builder --chown=jetpaas:nodejs /app/apps/web/dist ./apps/web/dist
COPY --from=builder --chown=jetpaas:nodejs /app/apps/web/package.json ./apps/web/package.json
COPY --from=builder --chown=jetpaas:nodejs /app/apps/web/server.mjs ./apps/web/server.mjs
COPY --from=builder --chown=jetpaas:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=jetpaas:nodejs /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=builder --chown=jetpaas:nodejs /app/package.json ./package.json
WORKDIR /app/apps/web
EXPOSE 3000
ENV HOST=0.0.0.0
ENV PORT=3000
CMD ["node", "server.mjs"]
