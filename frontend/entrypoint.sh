#!/bin/sh
set -e

# 使用 envsubst 仅替换 PORT 和 BACKEND_URL，保留 nginx 内置变量
envsubst '$PORT $BACKEND_URL' < /etc/nginx/nginx.conf.template > /etc/nginx/conf.d/default.conf

echo "nginx listening on port ${PORT:-3000}"

exec nginx -g 'daemon off;'
