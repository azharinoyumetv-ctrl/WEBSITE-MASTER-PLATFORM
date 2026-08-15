# syntax=docker/dockerfile:1.7
FROM node:20-bookworm-slim AS build

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ARG DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build
ENV DATABASE_URL=$DATABASE_URL

COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build && npm prune --omit=dev

FROM node:20-bookworm-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=4000 \
    HOSTNAME=0.0.0.0

RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=build --chown=nextjs:nodejs /app/package.json /app/package-lock.json /app/start.js ./
COPY --from=build --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nextjs:nodejs /app/.next ./.next
COPY --from=build --chown=nextjs:nodejs /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=build --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts

USER nextjs
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:4000/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "start.js"]
