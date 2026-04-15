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

# 复制 entrypoint 脚本
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# 复制构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

ENV PORT=3000
ENV BACKEND_URL=http://localhost:8000

EXPOSE 3000

ENTRYPOINT ["/entrypoint.sh"]
