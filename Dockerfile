FROM ghcr.io/astral-sh/uv:python3.14-bookworm-slim AS backend

WORKDIR /app

COPY pyproject.toml uv.lock README.md .python-version ./
COPY backend/src ./backend/src

RUN uv sync --locked --no-dev --no-editable

EXPOSE 8000

CMD ["uv", "run", "--no-dev", "uvicorn", "ares_control.http.app:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]


FROM node:26-alpine AS frontend

WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
