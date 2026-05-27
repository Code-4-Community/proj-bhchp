# syntax=docker/dockerfile:1

FROM node:20-bookworm-slim AS builder

WORKDIR /app

RUN corepack enable && corepack prepare yarn@1.22.22 --activate

COPY package.json yarn.lock nx.json tsconfig.base.json jest.preset.js ./

RUN yarn install --frozen-lockfile

COPY . .

RUN yarn nx build backend --configuration=production


FROM node:20-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN corepack enable && corepack prepare yarn@1.22.22 --activate

RUN apt-get update \
	&& apt-get install -y --no-install-recommends ca-certificates curl \
	&& rm -rf /var/lib/apt/lists/*

COPY package.json yarn.lock ./

RUN yarn install --frozen-lockfile --production=true && yarn cache clean

COPY --from=builder /app/dist/apps/backend ./dist/apps/backend

EXPOSE 3000

CMD ["sh", "-c", "curl -fsSL -o /app/global-bundle.pem https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem && exec node dist/apps/backend/main.js"]
