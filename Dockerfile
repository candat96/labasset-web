# Build tĩnh → phục vụ bằng nginx, proxy /v1 /sys /health tới API.
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Biến VITE_* lúc build (mặc định: cùng origin, tự phát hiện chế độ tenant)
ARG VITE_API_URL=
ARG VITE_TENANT_MODE=
ARG VITE_SHOW_SYS=false
RUN npm run build

FROM nginx:1.27-alpine
ENV API_UPSTREAM=http://api:3000
ENV NGINX_ENVSUBST_FILTER=API_UPSTREAM
COPY docker/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
