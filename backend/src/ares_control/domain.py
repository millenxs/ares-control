"""Pure domain rules for Mars probe navigation.

Domain objects enforce their own invariants at construction time so rules remain
valid even when invoked outside the HTTP/DTO layer.
"""

from dataclasses import dataclass, replace
from enum import StrEnum
from typing import Self, TypeIs


def _is_non_negative_int(value: object) -> TypeIs[int]:
    return type(value) is int and value >= 0


class ErrorCode(StrEnum):
    """Canonical error codes shared between domain and API adapters."""

    INVALID_PLATEAU = "invalid_plateau"
    INVALID_POSITION = "invalid_position"
    INVALID_DIRECTION = "invalid_direction"
    INVALID_PROBE_ID = "invalid_probe_id"
    INVALID_PROBE_PLACEMENT = "invalid_probe_placement"
    INVALID_COMMAND = "invalid_command"
    OUT_OF_BOUNDS = "out_of_bounds"
    PROBE_NOT_FOUND = "probe_not_found"


class DomainError(Exception):
    """Base error for domain invariant violations."""

    def __init__(
        self,
        code: ErrorCode,
        message: str,
        details: dict[str, object] | None = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.details = details or {}


class InvalidPlateauError(DomainError):
    def __init__(self, message: str, details: dict[str, object] | None = None) -> None:
        super().__init__(ErrorCode.INVALID_PLATEAU, message, details)


class InvalidPositionError(DomainError):
    def __init__(self, message: str, details: dict[str, object] | None = None) -> None:
        super().__init__(ErrorCode.INVALID_POSITION, message, details)


class InvalidDirectionError(DomainError):
    def __init__(self, direction: object) -> None:
        super().__init__(
            ErrorCode.INVALID_DIRECTION,
            "Direction must be one of NORTH, EAST, SOUTH, WEST.",
            {"direction": direction},
        )


class InvalidProbeIdError(DomainError):
    def __init__(self, probe_id: object) -> None:
        super().__init__(
            ErrorCode.INVALID_PROBE_ID,
            "Probe id must be a non-empty string.",
            {"id": probe_id},
        )


class InvalidProbePlacementError(DomainError):
    def __init__(
        self,
        *,
        x: int,
        y: int,
        max_x: int,
        max_y: int,
    ) -> None:
        super().__init__(
            ErrorCode.INVALID_PROBE_PLACEMENT,
            f"Initial probe position ({x}, {y}) is outside plateau ({max_x}, {max_y}).",
            {"x": x, "y": y, "max_x": max_x, "max_y": max_y},
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
        super().__init__(ErrorCode.INVALID_COMMAND, message, details)


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
            ErrorCode.OUT_OF_BOUNDS,
            f"Command at index {index} moves probe to ({x}, {y}), "
            f"outside plateau ({max_x}, {max_y}).",
            {"index": index, "x": x, "y": y, "max_x": max_x, "max_y": max_y},
        )


class ProbeNotFoundError(DomainError):
    def __init__(self, probe_id: str) -> None:
        super().__init__(
            ErrorCode.PROBE_NOT_FOUND,
            f"Probe '{probe_id}' was not found.",
            {"id": probe_id},
        )


class Direction(StrEnum):
    NORTH = "NORTH"
    EAST = "EAST"
    SOUTH = "SOUTH"
    WEST = "WEST"

    @classmethod
    def parse(cls, value: object) -> Self:
        if isinstance(value, str):
            try:
                return cls(value)
            except ValueError:
                pass
        raise InvalidDirectionError(value)

    def left(self) -> Direction:
        return _LEFT_ROTATION[self]

    def right(self) -> Direction:
        return _RIGHT_ROTATION[self]

    @property
    def delta(self) -> tuple[int, int]:
        return _DIRECTION_DELTAS[self]


_LEFT_ROTATION: dict[Direction, Direction] = {
    Direction.NORTH: Direction.WEST,
    Direction.WEST: Direction.SOUTH,
    Direction.SOUTH: Direction.EAST,
    Direction.EAST: Direction.NORTH,
}
_RIGHT_ROTATION: dict[Direction, Direction] = {v: k for k, v in _LEFT_ROTATION.items()}
_DIRECTION_DELTAS: dict[Direction, tuple[int, int]] = {
    Direction.NORTH: (0, 1),
    Direction.EAST: (1, 0),
    Direction.SOUTH: (0, -1),
    Direction.WEST: (-1, 0),
}


class Command(StrEnum):
    """Supported movement instructions for a Mars probe."""

    LEFT = "L"
    RIGHT = "R"
    MOVE = "M"

    @classmethod
    def parse(cls, symbol: str, *, index: int) -> Self:
        try:
            return cls(symbol)
        except ValueError:
            raise InvalidCommandError(
                f"Invalid command '{symbol}' at index {index}. Expected M, L, or R.",
                index=index,
                command=symbol,
            ) from None


def parse_commands(commands: str) -> tuple[Command, ...]:
    """Parse a non-empty command string into validated instructions.

    By domain decision, an empty command sequence is rejected rather than treated
    as a no-op so callers receive explicit feedback on malformed requests.
    """
    if type(commands) is not str or not commands:
        raise InvalidCommandError("Command sequence must be a non-empty string.")

    return tuple(Command.parse(symbol, index=index) for index, symbol in enumerate(commands))


@dataclass(frozen=True, slots=True)
class Position:
    """Zero-based integer coordinates `(x, y)` on a plateau grid."""

    x: int
    y: int

    def __post_init__(self) -> None:
        if not (_is_non_negative_int(self.x) and _is_non_negative_int(self.y)):
            raise InvalidPositionError(
                "Coordinates must be non-negative integers.",
                {"x": self.x, "y": self.y},
            )


@dataclass(frozen=True, slots=True)
class Plateau:
    """Rectangular grid starting at `(0, 0)` with inclusive upper bounds `(max_x, max_y)`."""

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
    """Immutable state of a deployed probe and its fixed plateau bounds."""

    id: str
    position: Position
    direction: Direction
    plateau: Plateau

    def __post_init__(self) -> None:
        if type(self.id) is not str or not self.id.strip():
            raise InvalidProbeIdError(self.id)
        if not isinstance(self.direction, Direction):
            raise InvalidDirectionError(self.direction)
        if not self.plateau.contains(self.position):
            raise InvalidProbePlacementError(
                x=self.position.x,
                y=self.position.y,
                max_x=self.plateau.max_x,
                max_y=self.plateau.max_y,
            )


def execute_commands(probe: Probe, commands: str) -> Probe:
    """Parse and simulate commands atomically, returning a new Probe only if all steps succeed.

    Empty command strings are rejected by design. Every intermediate movement step is
    validated against the probe's plateau bounds `[0..max_x, 0..max_y]`.
    """
    parsed_commands = parse_commands(commands)

    x, y = probe.position.x, probe.position.y
    direction = probe.direction

    for index, command in enumerate(parsed_commands):
        match command:
            case Command.LEFT:
                direction = direction.left()
            case Command.RIGHT:
                direction = direction.right()
            case Command.MOVE:
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

    return replace(probe, position=Position(x=x, y=y), direction=direction)
