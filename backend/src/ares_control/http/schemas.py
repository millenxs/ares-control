"""Pydantic request and response schemas for the HTTP API."""

from pydantic import BaseModel, ConfigDict, Field, StrictInt, StrictStr

from ares_control.domain import Direction, Probe


class LaunchProbeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    x: StrictInt = Field(le=1000)
    y: StrictInt = Field(le=1000)
    direction: StrictStr


class ExecuteCommandsRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    commands: StrictStr = Field(max_length=1000)


class PlateauResponse(BaseModel):
    max_x: int
    max_y: int


class ProbeResponse(BaseModel):
    id: str
    x: int
    y: int
    direction: Direction
    plateau: PlateauResponse

    @classmethod
    def from_domain(cls, probe: Probe) -> ProbeResponse:
        return cls(
            id=probe.id,
            x=probe.position.x,
            y=probe.position.y,
            direction=probe.direction,
            plateau=PlateauResponse(
                max_x=probe.plateau.max_x,
                max_y=probe.plateau.max_y,
            ),
        )


class ProbeListResponse(BaseModel):
    probes: list[ProbeResponse]
