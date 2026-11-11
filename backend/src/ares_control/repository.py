"""Probe repository port and in-memory adapter."""

from typing import Protocol

from ares_control.domain import Probe, ProbeNotFoundError


class ProbeRepository(Protocol):
    """Persistence contract for deployed Mars probes."""

    def get(self, probe_id: str) -> Probe | None: ...

    def add(self, probe: Probe) -> None: ...

    def update(self, probe: Probe) -> None: ...

    def list(self) -> list[Probe]: ...


class InMemoryProbeRepository:
    """Process-local dictionary store for probes."""

    def __init__(self) -> None:
        self._probes: dict[str, Probe] = {}

    def get(self, probe_id: str) -> Probe | None:
        return self._probes.get(probe_id)

    def add(self, probe: Probe) -> None:
        self._probes[probe.id] = probe

    def update(self, probe: Probe) -> None:
        if probe.id not in self._probes:
            raise ProbeNotFoundError(probe.id)
        self._probes[probe.id] = probe

    def list(self) -> list[Probe]:
        return list(self._probes.values())
