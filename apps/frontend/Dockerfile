# syntax=docker/dockerfile:1

FROM node:20-bookworm-slim AS builder

WORKDIR /app

RUN corepack enable && corepack prepare yarn@1.22.22 --activate

COPY package.json yarn.lock nx.json tsconfig.base.json jest.preset.js ./

RUN yarn install --frozen-lockfile

COPY . .

RUN yarn nx build frontend --configuration=production


FROM nginx:1.27-alpine AS runner

# SPA fallback for React Router
RUN printf 'server {\n  listen 80;\n  server_name _;\n  root /usr/share/nginx/html;\n  index index.html;\n  location / {\n    try_files \\$uri \\$uri/ /index.html;\n  }\n}\n' > /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist/apps/frontend /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
