"""Unit tests for application use cases and in-memory repository."""

from concurrent.futures import ThreadPoolExecutor
from threading import Event, Lock

import pytest

from ares_control.application import ExecuteCommands, LaunchProbe, ListProbes
from ares_control.domain import (
    Direction,
    ErrorCode,
    InvalidCommandError,
    OutOfBoundsError,
    Plateau,
    Position,
    Probe,
    ProbeNotFoundError,
)
from ares_control.repository import InMemoryProbeRepository


def test_launch_probe_always_starts_at_origin_with_associated_plateau() -> None:
    repository = InMemoryProbeRepository()
    launch = LaunchProbe(repository, id_generator=lambda: "probe-alpha")

    probe = launch.execute(max_x=5, max_y=7, direction="NORTH")

    assert probe == Probe(
        id="probe-alpha",
        position=Position(0, 0),
        direction=Direction.NORTH,
        plateau=Plateau(5, 7),
    )
    assert repository.get("probe-alpha") == probe


def test_launch_probe_generates_unique_default_ids() -> None:
    repository = InMemoryProbeRepository()
    launch = LaunchProbe(repository)

    first = launch.execute(max_x=3, max_y=3, direction="EAST")
    second = launch.execute(max_x=3, max_y=3, direction="WEST")

    assert first.id != second.id


def test_probes_with_different_plateaus_and_overlapping_positions_remain_independent() -> None:
    repository = InMemoryProbeRepository()
    ids = iter(["probe-small", "probe-large"])
    launch = LaunchProbe(repository, id_generator=lambda: next(ids))
    move = ExecuteCommands(repository, Lock())

    small = launch.execute(max_x=1, max_y=1, direction="NORTH")
    large = launch.execute(max_x=5, max_y=5, direction="NORTH")

    assert small.position == large.position == Position(0, 0)

    moved_small = move.execute(probe_id="probe-small", commands="MRM")
    moved_large = move.execute(probe_id="probe-large", commands="MRM")

    assert moved_small.position == moved_large.position == Position(1, 1)
    assert moved_small.plateau == Plateau(1, 1)
    assert moved_large.plateau == Plateau(5, 5)

    with pytest.raises(OutOfBoundsError):
        move.execute(probe_id="probe-small", commands="M")

    moved_large_again = move.execute(probe_id="probe-large", commands="M")
    assert moved_large_again.position == Position(2, 1)


def test_execute_commands_raises_not_found_for_unknown_probe() -> None:
    repository = InMemoryProbeRepository()
    move = ExecuteCommands(repository, Lock())

    with pytest.raises(ProbeNotFoundError) as exc_info:
        move.execute(probe_id="missing-id", commands="M")

    assert exc_info.value.code == ErrorCode.PROBE_NOT_FOUND
    assert exc_info.value.details == {"id": "missing-id"}


def test_repository_update_rejects_unknown_probe() -> None:
    repository = InMemoryProbeRepository()
    orphan = Probe(
        id="ghost",
        position=Position(0, 0),
        direction=Direction.NORTH,
        plateau=Plateau(2, 2),
    )

    with pytest.raises(ProbeNotFoundError):
        repository.update(orphan)


def test_update_is_not_called_and_state_is_preserved_when_movement_fails() -> None:
    class SpyRepository(InMemoryProbeRepository):
        def __init__(self) -> None:
            super().__init__()
            self.update_calls = 0

        def update(self, probe: Probe) -> None:
            self.update_calls += 1
            super().update(probe)

    repository = SpyRepository()
    launch = LaunchProbe(repository, id_generator=lambda: "probe-1")
    move = ExecuteCommands(repository, Lock())

    launch.execute(max_x=2, max_y=2, direction="NORTH")

    with pytest.raises(InvalidCommandError):
        move.execute(probe_id="probe-1", commands="MRX")

    with pytest.raises(OutOfBoundsError):
        move.execute(probe_id="probe-1", commands="MMM")

    assert repository.update_calls == 0
    stored = repository.get("probe-1")
    assert stored is not None
    assert stored.position == Position(0, 0)
    assert stored.direction == Direction.NORTH


def test_list_probes_returns_empty_list_and_defensive_copy() -> None:
    repository = InMemoryProbeRepository()
    list_probes = ListProbes(repository)
    launch = LaunchProbe(repository, id_generator=lambda: "probe-1")

    assert list_probes.execute() == []

    probe = launch.execute(max_x=4, max_y=4, direction="SOUTH")
    listed = list_probes.execute()
    assert listed == [probe]

    listed.clear()
    assert list_probes.execute() == [probe]


def test_execute_commands_serializes_concurrent_updates_with_shared_lock() -> None:
    first_entered_get = Event()
    second_started = Event()
    events: list[str] = []

    class CoordinatedRepository(InMemoryProbeRepository):
        def get(self, probe_id: str) -> Probe | None:
            probe = super().get(probe_id)
            assert probe is not None
            events.append(f"get:{probe.position.y}")
            if len(events) == 1:
                first_entered_get.set()
                assert second_started.wait(timeout=2.0)
            return probe

        def update(self, probe: Probe) -> None:
            events.append(f"update:{probe.position.y}")
            super().update(probe)

    repository = CoordinatedRepository()
    shared_lock = Lock()
    launch = LaunchProbe(repository, id_generator=lambda: "probe-1")
    move = ExecuteCommands(repository, shared_lock)
    launch.execute(max_x=5, max_y=5, direction="NORTH")

    def second_move() -> Probe:
        assert first_entered_get.wait(timeout=2.0)
        second_started.set()
        return move.execute(probe_id="probe-1", commands="M")

    with ThreadPoolExecutor(max_workers=2) as pool:
        first_future = pool.submit(move.execute, probe_id="probe-1", commands="M")
        second_future = pool.submit(second_move)
        first_future.result(timeout=2.0)
        final_probe = second_future.result(timeout=2.0)

    assert events == ["get:0", "update:1", "get:1", "update:2"]
    assert final_probe.position == Position(0, 2)
    assert final_probe.direction == Direction.NORTH
