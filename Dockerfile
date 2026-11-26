FROM ghcr.io/astral-sh/uv:python3.14-bookworm-slim AS backend

WORKDIR /app

COPY pyproject.toml uv.lock README.md .python-version ./
COPY backend/src ./backend/src

RUN uv sync --locked --no-dev --no-editable \
    && useradd --system --create-home appuser \
    && chown -R appuser:appuser /app

USER appuser

EXPOSE 8000

CMD ["uv", "run", "--no-dev", "uvicorn", "ares_control.http.app:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]


FROM node:26-alpine AS frontend-build

WORKDIR /app/frontend

ARG VITE_API_BASE_URL=http://localhost:8000
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build


FROM nginx:1.27-alpine AS frontend

COPY --from=frontend-build /app/frontend/dist /usr/share/nginx/html

RUN printf 'server {\n\
    listen 5173;\n\
    server_name _;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
    gzip on;\n\
    gzip_types text/plain text/css application/json application/javascript image/svg+xml;\n\
    add_header X-Content-Type-Options "nosniff" always;\n\
    add_header X-Frame-Options "DENY" always;\n\
    location /assets/ {\n\
        expires 1y;\n\
        add_header Cache-Control "public, immutable";\n\
    }\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
}\n' > /etc/nginx/conf.d/default.conf \
    && chown -R nginx:nginx /usr/share/nginx/html /var/cache/nginx /var/log/nginx /etc/nginx/conf.d \
    && touch /var/run/nginx.pid \
    && chown nginx:nginx /var/run/nginx.pid

USER nginx

EXPOSE 5173

CMD ["nginx", "-g", "daemon off;"]
