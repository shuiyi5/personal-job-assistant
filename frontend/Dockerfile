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

# 复制 nginx 配置模板 (包含 ${PORT} 和 ${BACKEND_URL} 占位符)
COPY nginx.conf /etc/nginx/nginx.conf.template

# 复制构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

ENV PORT=3000
ENV BACKEND_URL=http://localhost:8000

EXPOSE ${PORT}

# 用 envsubst 只替换 ${BACKEND_URL}，避免破坏 nginx 内置变量（如 $host、$uri 等）
CMD ["/bin/sh", "-c", "envsubst '${BACKEND_URL}' < /etc/nginx/nginx.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
