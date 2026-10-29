FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN DATABASE_URL=postgresql://build:build@localhost/build npm ci
COPY . .
RUN BACKEND_ENABLED=true NEXT_PUBLIC_ENABLE_MOCK=false npm run build

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production BACKEND_ENABLED=true NEXT_PUBLIC_ENABLE_MOCK=false HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=build --chown=node:node /app /app
USER node
EXPOSE 3000
CMD ["sh", "-c", "npm run db:migrate && npm run db:bootstrap && node node_modules/next/dist/bin/next start --hostname 0.0.0.0"]
