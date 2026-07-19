# syntax=docker/dockerfile:1

FROM node:24-alpine AS build

WORKDIR /app

RUN npm install --global pnpm@10

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

ARG VITE_API_HOST=http://localhost:8000
ARG VITE_APP_ENV=production
ENV VITE_API_HOST=${VITE_API_HOST}
ENV VITE_APP_ENV=${VITE_APP_ENV}

RUN pnpm build

FROM nginx:stable-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
