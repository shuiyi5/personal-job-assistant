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
# 复制自定义 nginx 配置模板
COPY nginx.conf /etc/nginx/templates/default.conf.template
# 复制构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

ENV PORT=3000
EXPOSE ${PORT}

# nginx 官方镜像的 entrypoint 会自动处理 /etc/nginx/templates/ 中的
# .template 文件，用环境变量替换 ${VAR} 后输出到 /etc/nginx/conf.d/
CMD ["nginx", "-g", "daemon off;"]
