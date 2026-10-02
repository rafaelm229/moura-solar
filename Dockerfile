FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV CI=true
RUN apk add --no-cache zip unzip
RUN corepack enable
WORKDIR /app

FROM base AS dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/api-client/package.json packages/api-client/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/design-tokens/package.json packages/design-tokens/package.json
COPY packages/typescript-config/package.json packages/typescript-config/package.json
RUN pnpm install --frozen-lockfile

FROM dependencies AS builder
ENV API_INTERNAL_URL=http://api:3001/api/v1
COPY . .
RUN pnpm db:generate
RUN pnpm build

FROM dependencies AS tools
COPY . .
RUN pnpm db:generate
CMD ["pnpm", "db:deploy"]

FROM base AS api
ENV NODE_ENV=production
COPY --from=builder /app /app
EXPOSE 3001
CMD ["pnpm", "--filter", "@moura-solar/api", "start"]

FROM base AS web
ENV NODE_ENV=production
COPY --from=builder /app /app
EXPOSE 3000
CMD ["pnpm", "--filter", "@moura-solar/web", "start"]
