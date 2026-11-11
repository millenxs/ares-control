"""Pure domain rules for Mars probe navigation."""

from dataclasses import dataclass, replace
from enum import StrEnum
from typing import TypeGuard


def _is_non_negative_int(value: object) -> TypeGuard[int]:
    return type(value) is int and value >= 0


class DomainError(Exception):
    """Base error for domain invariant violations."""

    def __init__(
        self,
        code: str,
        message: str,
        details: dict[str, object] | None = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.details = details or {}


class InvalidPlateauError(DomainError):
    def __init__(self, message: str, details: dict[str, object] | None = None) -> None:
        super().__init__("invalid_plateau", message, details)


class InvalidDirectionError(DomainError):
    def __init__(self, direction: object) -> None:
        super().__init__(
            "invalid_direction",
            "Direction must be one of NORTH, EAST, SOUTH, WEST.",
            {"direction": direction},
        )


class InvalidCommandError(DomainError):
    def __init__(
        self,
        message: str,
        *,
        index: int | None = None,
        command: str | None = None,
    ) -> None:
        details: dict[str, object] = {}
        if index is not None:
            details["index"] = index
        if command is not None:
            details["command"] = command
        super().__init__("invalid_command", message, details)


class OutOfBoundsError(DomainError):
    def __init__(
        self,
        *,
        index: int,
        x: int,
        y: int,
        max_x: int,
        max_y: int,
    ) -> None:
        super().__init__(
            "out_of_bounds",
            f"Command at index {index} moves probe to ({x}, {y}), "
            f"outside plateau ({max_x}, {max_y}).",
            {"index": index, "x": x, "y": y, "max_x": max_x, "max_y": max_y},
        )


class Direction(StrEnum):
    NORTH = "NORTH"
    EAST = "EAST"
    SOUTH = "SOUTH"
    WEST = "WEST"

    @classmethod
    def parse(cls, value: object) -> Direction:
        if isinstance(value, str):
            try:
                return cls(value)
            except ValueError:
                pass
        raise InvalidDirectionError(value)

    def left(self) -> Direction:
        return _ROTATION_ORDER[(_ROTATION_ORDER.index(self) - 1) % 4]

    def right(self) -> Direction:
        return _ROTATION_ORDER[(_ROTATION_ORDER.index(self) + 1) % 4]

    @property
    def delta(self) -> tuple[int, int]:
        return _DIRECTION_DELTAS[self]


_ROTATION_ORDER = (Direction.NORTH, Direction.EAST, Direction.SOUTH, Direction.WEST)
_DIRECTION_DELTAS = {
    Direction.NORTH: (0, 1),
    Direction.EAST: (1, 0),
    Direction.SOUTH: (0, -1),
    Direction.WEST: (-1, 0),
}


@dataclass(frozen=True, slots=True)
class Position:
    x: int
    y: int

    def __post_init__(self) -> None:
        if not (_is_non_negative_int(self.x) and _is_non_negative_int(self.y)):
            raise InvalidPlateauError(
                "Coordinates must be non-negative integers.",
                {"x": self.x, "y": self.y},
            )


@dataclass(frozen=True, slots=True)
class Plateau:
    max_x: int
    max_y: int

    def __post_init__(self) -> None:
        if not (_is_non_negative_int(self.max_x) and _is_non_negative_int(self.max_y)):
            raise InvalidPlateauError(
                "Plateau bounds must be non-negative integers.",
                {"max_x": self.max_x, "max_y": self.max_y},
            )

    def is_within_bounds(self, x: int, y: int) -> bool:
        return 0 <= x <= self.max_x and 0 <= y <= self.max_y

    def contains(self, position: Position) -> bool:
        return self.is_within_bounds(position.x, position.y)


@dataclass(frozen=True, slots=True)
class Probe:
    id: str
    position: Position
    direction: Direction
    plateau: Plateau

    def __post_init__(self) -> None:
        if type(self.id) is not str or not self.id.strip():
            raise DomainError("invalid_probe_id", "Probe id must be a non-empty string.")
        if not isinstance(self.direction, Direction):
            raise InvalidDirectionError(self.direction)
        if not self.plateau.contains(self.position):
            raise OutOfBoundsError(
                index=0,
                x=self.position.x,
                y=self.position.y,
                max_x=self.plateau.max_x,
                max_y=self.plateau.max_y,
            )


def execute_commands(probe: Probe, commands: str) -> Probe:
    """Simulate commands atomically and return a new Probe only if all steps are valid."""
    if type(commands) is not str or not commands:
        raise InvalidCommandError("Command sequence must be a non-empty string.")

    x, y = probe.position.x, probe.position.y
    direction = probe.direction

    for index, symbol in enumerate(commands):
        if symbol == "L":
            direction = direction.left()
        elif symbol == "R":
            direction = direction.right()
        elif symbol == "M":
            dx, dy = direction.delta
            next_x, next_y = x + dx, y + dy
            if not probe.plateau.is_within_bounds(next_x, next_y):
                raise OutOfBoundsError(
                    index=index,
                    x=next_x,
                    y=next_y,
                    max_x=probe.plateau.max_x,
                    max_y=probe.plateau.max_y,
                )
            x, y = next_x, next_y
        else:
            raise InvalidCommandError(
                f"Invalid command '{symbol}' at index {index}. Expected M, L, or R.",
                index=index,
                command=symbol,
            )

    return replace(probe, position=Position(x=x, y=y), direction=direction)
