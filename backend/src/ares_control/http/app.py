"""FastAPI application composition root and error handlers."""

import os
from threading import Lock

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse

from ares_control.application import ExecuteCommands, LaunchProbe, ListProbes
from ares_control.domain import DomainError, ErrorCode
from ares_control.http.routes import create_router
from ares_control.repository import InMemoryProbeRepository, ProbeRepository


def _parse_cors_origins() -> list[str]:
    raw_origins = os.getenv("ARES_CORS_ORIGINS", "http://localhost:5173")
    return [origin.strip() for origin in raw_origins.split(",") if origin.strip()]


def _error_response(
    *,
    status_code: int,
    code: str,
    message: str,
    details: dict[str, object],
) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={
            "error": {
                "code": code,
                "message": message,
                "details": details,
            },
        },
    )


def create_app(
    *,
    repository: ProbeRepository | None = None,
    lock: Lock | None = None,
) -> FastAPI:
    probe_repository = repository if repository is not None else InMemoryProbeRepository()
    movement_lock = lock if lock is not None else Lock()

    launch_probe = LaunchProbe(probe_repository)
    execute_commands = ExecuteCommands(probe_repository, movement_lock)
    list_probes = ListProbes(probe_repository)

    application = FastAPI(
        title="Ares Control API",
        description="API para controle de sondas em Marte.",
        version="0.1.0",
    )

    application.add_middleware(
        CORSMiddleware,
        allow_origins=_parse_cors_origins(),
        allow_origin_regex=r"^https://.*\.vercel\.app$",
        allow_credentials=False,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type"],
    )

    @application.get("/", include_in_schema=False)
    def redirect_root_to_docs() -> RedirectResponse:
        return RedirectResponse(url="/docs")

    @application.exception_handler(DomainError)
    def handle_domain_error(_request: Request, exc: DomainError) -> JSONResponse:
        http_status = (
            status.HTTP_404_NOT_FOUND
            if exc.code == ErrorCode.PROBE_NOT_FOUND
            else status.HTTP_422_UNPROCESSABLE_CONTENT
        )
        return _error_response(
            status_code=http_status,
            code=exc.code,
            message=exc.message,
            details=exc.details,
        )

    @application.exception_handler(RequestValidationError)
    def handle_validation_error(
        _request: Request,
        exc: RequestValidationError,
    ) -> JSONResponse:
        issues = [
            {
                "field": ".".join(str(part) for part in error["loc"]),
                "message": error["msg"],
                "type": error["type"],
            }
            for error in exc.errors()
        ]
        return _error_response(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            code="validation_error",
            message="Request payload failed validation.",
            details={"issues": issues},
        )

    application.include_router(
        create_router(launch_probe, execute_commands, list_probes),
    )
    return application


app = create_app()
