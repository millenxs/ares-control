"""Application use cases coordinating probe domain rules and persistence."""

from collections.abc import Callable
from threading import Lock
from uuid import uuid4

from ares_control.domain import (
    Direction,
    Plateau,
    Position,
    Probe,
    ProbeNotFoundError,
    execute_commands,
)
from ares_control.repository import ProbeRepository


def _generate_probe_id() -> str:
    return str(uuid4())


class LaunchProbe:
    """Launch a new probe at (0, 0) with its own plateau bounds."""

    def __init__(
        self,
        repository: ProbeRepository,
        id_generator: Callable[[], str] = _generate_probe_id,
    ) -> None:
        self._repository = repository
        self._id_generator = id_generator

    def execute(self, *, max_x: int, max_y: int, direction: str | Direction) -> Probe:
        probe = Probe(
            id=self._id_generator(),
            position=Position(0, 0),
            direction=Direction.parse(direction),
            plateau=Plateau(max_x=max_x, max_y=max_y),
        )
        self._repository.add(probe)
        return probe


class ExecuteCommands:
    """Execute movement instructions atomically under a shared synchronization lock."""

    def __init__(self, repository: ProbeRepository, lock: Lock) -> None:
        self._repository = repository
        self._lock = lock

    def execute(self, *, probe_id: str, commands: str) -> Probe:
        with self._lock:
            probe = self._repository.get(probe_id)
            if probe is None:
                raise ProbeNotFoundError(probe_id)
            moved_probe = execute_commands(probe, commands)
            self._repository.update(moved_probe)
            return moved_probe


class ListProbes:
    """Return all deployed probes in launch order."""

    def __init__(self, repository: ProbeRepository) -> None:
        self._repository = repository

    def execute(self) -> list[Probe]:
        return self._repository.list()
