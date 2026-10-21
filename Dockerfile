FROM node:24-bookworm-slim AS deps
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

FROM node:24-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
ENV SESSION_SECRET=build-time-only-secret-value-32chars
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

FROM node:24-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    libreoffice-writer \
    poppler-utils \
    fonts-liberation \
    fonts-dejavu-core \
    fontconfig \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*
# La plantilla usa Arial, Georgia y Times New Roman. El alias las resuelve
# con Liberation, que ya está instalada. Un archivo .ttf propio puede ir en docker/fonts/.
COPY docker/fonts/ /usr/local/share/fonts/hotel/
COPY docker/fonts/99-hotel-aliases.conf /etc/fonts/conf.d/99-hotel-aliases.conf
RUN fc-cache -f
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/public ./public
COPY --from=builder /app/templates ./templates
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh \
  && npx playwright install-deps chromium \
  && npx playwright install chromium
RUN sed -i 's/\r$//' /entrypoint.sh
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build npx prisma generate
EXPOSE 3000
ENTRYPOINT ["/entrypoint.sh"]
