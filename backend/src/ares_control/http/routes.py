"""REST routes for launching, moving, and listing Mars probes."""

from fastapi import APIRouter, status

from ares_control.application import ExecuteCommands, LaunchProbe, ListProbes
from ares_control.http.schemas import (
    ExecuteCommandsRequest,
    LaunchProbeRequest,
    ProbeListResponse,
    ProbeResponse,
)


def create_router(
    launch_probe: LaunchProbe,
    execute_commands: ExecuteCommands,
    list_probes: ListProbes,
) -> APIRouter:
    router = APIRouter(prefix="/api/v1", tags=["probes"])

    @router.post("/probes", status_code=status.HTTP_201_CREATED)
    def launch_probe_endpoint(payload: LaunchProbeRequest) -> ProbeResponse:
        probe = launch_probe.execute(
            max_x=payload.x,
            max_y=payload.y,
            direction=payload.direction,
        )
        return ProbeResponse.from_domain(probe)

    @router.post("/probes/{probe_id}/commands", status_code=status.HTTP_200_OK)
    def execute_commands_endpoint(
        probe_id: str,
        payload: ExecuteCommandsRequest,
    ) -> ProbeResponse:
        probe = execute_commands.execute(
            probe_id=probe_id,
            commands=payload.commands,
        )
        return ProbeResponse.from_domain(probe)

    @router.get("/probes", status_code=status.HTTP_200_OK)
    def list_probes_endpoint() -> ProbeListResponse:
        return ProbeListResponse(
            probes=[ProbeResponse.from_domain(probe) for probe in list_probes.execute()],
        )

    return router
