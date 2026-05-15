# syntax=docker/dockerfile:1

FROM node:20-bookworm-slim AS builder

WORKDIR /app

RUN npm install -g yarn@1.22.22

COPY package.json yarn.lock nx.json tsconfig.base.json jest.preset.js ./

RUN yarn install --frozen-lockfile

COPY . .

RUN yarn nx build backend --configuration=production


FROM node:20-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN npm install -g yarn@1.22.22

COPY package.json yarn.lock ./

RUN yarn install --frozen-lockfile --production=true && yarn cache clean

COPY --from=builder /app/dist/apps/backend ./dist/apps/backend

EXPOSE 3000

CMD ["node", "dist/apps/backend/main.js"]
