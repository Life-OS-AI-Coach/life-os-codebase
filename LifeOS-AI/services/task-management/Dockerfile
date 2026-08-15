# =============================================================================
# LifeOS AI — Task Management API (NestJS)
# Build context is the repo root (LifeOS-AI/) so the Prisma schema under
# data/prisma is reachable at the same relative path used for local dev.
# =============================================================================

# ---- Base -------------------------------------------------------------------
FROM node:20-alpine AS base
# libc compat for Prisma engine on Alpine
RUN apk add --no-cache libc6-compat bash
WORKDIR /app/services/task-management

# ---- Dependencies -----------------------------------------------------------
FROM base AS deps
COPY services/task-management/package.json ./
RUN npm install
# Prisma client generation needs the schema present.
COPY data/prisma /app/data/prisma
RUN npx prisma generate

# ---- Development target (hot reload; source is bind-mounted at runtime) ------
FROM base AS development
ENV NODE_ENV=development
COPY --from=deps /app/services/task-management/node_modules ./node_modules
COPY data/prisma /app/data/prisma
COPY services/task-management ./
RUN chmod +x ./docker-entrypoint.sh
EXPOSE 3001
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["npm", "run", "dev"]

# ---- Build ------------------------------------------------------------------
FROM base AS build
COPY --from=deps /app/services/task-management/node_modules ./node_modules
COPY data/prisma /app/data/prisma
COPY services/task-management ./
RUN npx prisma generate && npm run build \
  && npm prune --omit=dev

# ---- Production target ------------------------------------------------------
FROM base AS production
ENV NODE_ENV=production
COPY --from=build /app/services/task-management/node_modules ./node_modules
COPY --from=build /app/services/task-management/dist ./dist
COPY --from=build /app/data/prisma /app/data/prisma
COPY services/task-management/package.json ./
COPY services/task-management/docker-entrypoint.sh ./
RUN chmod +x ./docker-entrypoint.sh
EXPOSE 3001
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/main.js"]
