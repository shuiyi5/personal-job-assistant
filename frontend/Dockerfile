# ── Stage 1: Build ───────────────────────────────────
FROM node:18-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ── Stage 2: Serve with nginx ────────────────────────
FROM nginx:alpine

# 删除默认配置
RUN rm /etc/nginx/conf.d/default.conf

# 复制构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制 nginx 配置模板
COPY nginx.conf /etc/nginx/conf.d/default.conf.template

ENV BACKEND_URL=backend-production-4987.up.railway.app
ENV PORT=3000

EXPOSE 3000

CMD ["/bin/sh", "-c", "sed -e 's|BACKEND_URL_PLACEHOLDER|'\"$BACKEND_URL\"'|g' -e 's|PORT_PLACEHOLDER|'\"${PORT:-3000}\"'|g' /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
