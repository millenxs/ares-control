"""Unit tests for pure domain rules."""

import pytest

from ares_control.domain import (
    Direction,
    InvalidCommandError,
    InvalidDirectionError,
    InvalidPlateauError,
    OutOfBoundsError,
    Plateau,
    Position,
    Probe,
    execute_commands,
)


def make_probe(
    *,
    x: int = 0,
    y: int = 0,
    direction: Direction = Direction.NORTH,
    max_x: int = 5,
    max_y: int = 5,
) -> Probe:
    return Probe(
        id="probe-1",
        position=Position(x=x, y=y),
        direction=direction,
        plateau=Plateau(max_x=max_x, max_y=max_y),
    )


def test_challenge_example_mrm_reaches_one_one_east() -> None:
    probe = make_probe(x=0, y=0, direction=Direction.NORTH, max_x=5, max_y=5)

    moved = execute_commands(probe, "MRM")

    assert moved.position == Position(1, 1)
    assert moved.direction == Direction.EAST
    assert moved.plateau == Plateau(5, 5)


@pytest.mark.parametrize(
    ("start", "command", "expected"),
    [
        (Direction.NORTH, "L", Direction.WEST),
        (Direction.WEST, "L", Direction.SOUTH),
        (Direction.SOUTH, "L", Direction.EAST),
        (Direction.EAST, "L", Direction.NORTH),
        (Direction.NORTH, "R", Direction.EAST),
        (Direction.EAST, "R", Direction.SOUTH),
        (Direction.SOUTH, "R", Direction.WEST),
        (Direction.WEST, "R", Direction.NORTH),
    ],
)
def test_rotations_in_all_directions_without_changing_coordinates(
    start: Direction,
    command: str,
    expected: Direction,
) -> None:
    probe = make_probe(x=2, y=3, direction=start)

    rotated = execute_commands(probe, command)

    assert rotated.direction == expected
    assert rotated.position == Position(2, 3)


@pytest.mark.parametrize(
    ("direction", "expected_position"),
    [
        (Direction.NORTH, Position(2, 3)),
        (Direction.EAST, Position(3, 2)),
        (Direction.SOUTH, Position(2, 1)),
        (Direction.WEST, Position(1, 2)),
    ],
)
def test_cardinal_advance_in_all_directions(
    direction: Direction,
    expected_position: Position,
) -> None:
    probe = make_probe(x=2, y=2, direction=direction)

    moved = execute_commands(probe, "M")

    assert moved.position == expected_position
    assert moved.direction == direction


@pytest.mark.parametrize(
    ("x", "y", "direction"),
    [
        (0, 5, Direction.NORTH),
        (5, 5, Direction.NORTH),
        (5, 5, Direction.EAST),
        (5, 0, Direction.EAST),
        (5, 0, Direction.SOUTH),
        (0, 0, Direction.SOUTH),
        (0, 0, Direction.WEST),
        (0, 5, Direction.WEST),
    ],
)
def test_out_of_bounds_rejected_at_every_edge_and_corner(
    x: int,
    y: int,
    direction: Direction,
) -> None:
    probe = make_probe(x=x, y=y, direction=direction, max_x=5, max_y=5)

    with pytest.raises(OutOfBoundsError) as exc_info:
        execute_commands(probe, "M")

    assert exc_info.value.code == "out_of_bounds"
    assert exc_info.value.details["index"] == 0


def test_zero_sized_plateau_allows_rotation_and_rejects_movement() -> None:
    probe = make_probe(x=0, y=0, direction=Direction.NORTH, max_x=0, max_y=0)

    rotated = execute_commands(probe, "RLL")
    assert rotated.position == Position(0, 0)
    assert rotated.direction == Direction.WEST

    with pytest.raises(OutOfBoundsError) as exc_info:
        execute_commands(probe, "M")
    assert exc_info.value.details["index"] == 0


@pytest.mark.parametrize("invalid_value", [-1, True, False, "5", 2.5, None])
def test_plateau_and_position_reject_non_strict_or_negative_integers(
    invalid_value: object,
) -> None:
    with pytest.raises(InvalidPlateauError):
        Plateau(max_x=invalid_value, max_y=5)  # type: ignore[arg-type]

    with pytest.raises(InvalidPlateauError):
        Plateau(max_x=5, max_y=invalid_value)  # type: ignore[arg-type]

    with pytest.raises(InvalidPlateauError):
        Position(x=invalid_value, y=0)  # type: ignore[arg-type]


@pytest.mark.parametrize("raw_direction", ["north", "N", "", None, 123])
def test_direction_parse_rejects_invalid_values(raw_direction: object) -> None:
    with pytest.raises(InvalidDirectionError):
        Direction.parse(raw_direction)


@pytest.mark.parametrize(
    ("commands", "expected_index", "expected_symbol"),
    [
        ("X", 0, "X"),
        ("MRX", 2, "X"),
        ("mrm", 0, "m"),
        ("MRm", 2, "m"),
        ("M R", 1, " "),
        (" M", 0, " "),
        ("M\nM", 1, "\n"),
    ],
)
def test_invalid_commands_report_zero_based_index(
    commands: str,
    expected_index: int,
    expected_symbol: str,
) -> None:
    probe = make_probe()

    with pytest.raises(InvalidCommandError) as exc_info:
        execute_commands(probe, commands)

    assert exc_info.value.code == "invalid_command"
    assert exc_info.value.details == {"index": expected_index, "command": expected_symbol}


def test_empty_command_sequence_is_rejected() -> None:
    probe = make_probe()

    with pytest.raises(InvalidCommandError) as exc_info:
        execute_commands(probe, "")

    assert exc_info.value.code == "invalid_command"
    assert exc_info.value.details == {}


def test_atomic_rejection_preserves_original_position_and_direction() -> None:
    probe = make_probe(x=0, y=0, direction=Direction.NORTH, max_x=2, max_y=2)

    with pytest.raises(OutOfBoundsError) as exc_info:
        execute_commands(probe, "MRMMM")

    assert exc_info.value.details["index"] == 4
    assert probe.position == Position(0, 0)
    assert probe.direction == Direction.NORTH


def test_crossing_boundary_and_returning_fails_on_first_invalid_step() -> None:
    probe = make_probe(x=0, y=5, direction=Direction.NORTH, max_x=5, max_y=5)

    with pytest.raises(OutOfBoundsError) as exc_info:
        execute_commands(probe, "MLLM")

    assert exc_info.value.details["index"] == 0
    assert probe.position == Position(0, 5)
    assert probe.direction == Direction.NORTH
