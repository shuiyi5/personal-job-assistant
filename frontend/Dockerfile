# ── Stage 1: Build ───────────────────────────────────
FROM node:18-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ── Stage 2: Serve with nginx ────────────────────────
FROM nginx:alpine
# 安装 gettext（提供 envsubst 工具）
RUN apk add --no-cache gettext
# 删除默认配置
RUN rm /etc/nginx/conf.d/default.conf
# 复制自定义 nginx 配置模板
COPY nginx.conf /etc/nginx/templates/default.conf.template
# 复制构建产物
COPY --from=builder /app/dist /usr/share/nginx/html
# 复制并授权 entrypoint 脚本
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 3000

# 使用 entrypoint 脚本在启动前完成环境变量替换
CMD ["/docker-entrypoint.sh"]
