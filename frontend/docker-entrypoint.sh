#!/bin/sh
set -e

# Default BACKEND_URL if not provided
: "${BACKEND_URL:=http://localhost:8000}"

# Substitute environment variables in the nginx config template
# Only substitute $BACKEND_URL to avoid clobbering nginx's own $variables
envsubst '${BACKEND_URL}' \
  < /etc/nginx/templates/default.conf.template \
  > /etc/nginx/conf.d/default.conf

echo "nginx config generated with BACKEND_URL=${BACKEND_URL}"

# Hand off to nginx
exec nginx -g "daemon off;"
