"""HTTP integration tests for the FastAPI presentation layer."""

from concurrent.futures import ThreadPoolExecutor
from threading import Event

import pytest
from fastapi.testclient import TestClient

from ares_control.domain import Probe
from ares_control.http.app import create_app
from ares_control.repository import InMemoryProbeRepository


@pytest.fixture
def client() -> TestClient:
    return TestClient(create_app())


def test_list_probes_returns_empty_collection_initially(client: TestClient) -> None:
    response = client.get("/api/v1/probes")

    assert response.status_code == 200
    assert response.json() == {"probes": []}


def test_launch_move_and_list_probe_lifecycle_includes_plateau_metadata(
    client: TestClient,
) -> None:
    launch_response = client.post(
        "/api/v1/probes",
        json={"x": 5, "y": 5, "direction": "NORTH"},
    )
    assert launch_response.status_code == 201
    launched = launch_response.json()
    probe_id = launched["id"]
    assert isinstance(probe_id, str) and probe_id
    assert launched == {
        "id": probe_id,
        "x": 0,
        "y": 0,
        "direction": "NORTH",
        "plateau": {"max_x": 5, "max_y": 5},
    }

    move_response = client.post(
        f"/api/v1/probes/{probe_id}/commands",
        json={"commands": "MRM"},
    )
    assert move_response.status_code == 200
    assert move_response.json() == {
        "id": probe_id,
        "x": 1,
        "y": 1,
        "direction": "EAST",
        "plateau": {"max_x": 5, "max_y": 5},
    }

    list_response = client.get("/api/v1/probes")
    assert list_response.status_code == 200
    assert list_response.json() == {
        "probes": [
            {
                "id": probe_id,
                "x": 1,
                "y": 1,
                "direction": "EAST",
                "plateau": {"max_x": 5, "max_y": 5},
            },
        ],
    }


def test_launch_probe_accepts_zero_bounds(client: TestClient) -> None:
    response = client.post(
        "/api/v1/probes",
        json={"x": 0, "y": 0, "direction": "WEST"},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["x"] == 0
    assert body["y"] == 0
    assert body["direction"] == "WEST"
    assert body["plateau"] == {"max_x": 0, "max_y": 0}


@pytest.mark.parametrize(
    "payload",
    [
        {"x": "5", "y": 5, "direction": "NORTH"},
        {"x": 5, "y": "5", "direction": "NORTH"},
        {"x": True, "y": 5, "direction": "NORTH"},
        {"x": False, "y": 5, "direction": "NORTH"},
        {"x": 2.5, "y": 5, "direction": "NORTH"},
        {"x": 5, "y": 5, "direction": 123},
        {"x": 5, "y": 5, "direction": "NORTH", "extra": 1},
    ],
)
def test_launch_probe_rejects_non_strict_types_with_consistent_error_envelope(
    client: TestClient,
    payload: dict[str, object],
) -> None:
    response = client.post("/api/v1/probes", json=payload)

    assert response.status_code == 422
    error = response.json()["error"]
    assert error["code"] == "validation_error"
    assert isinstance(error["message"], str)
    assert isinstance(error["details"]["issues"], list)


def test_launch_probe_rejects_negative_bounds_and_invalid_direction(
    client: TestClient,
) -> None:
    negative_response = client.post(
        "/api/v1/probes",
        json={"x": -1, "y": 5, "direction": "NORTH"},
    )
    assert negative_response.status_code == 422
    assert negative_response.json()["error"]["code"] == "invalid_plateau"

    direction_response = client.post(
        "/api/v1/probes",
        json={"x": 5, "y": 5, "direction": "UP"},
    )
    assert direction_response.status_code == 422
    assert direction_response.json()["error"] == {
        "code": "invalid_direction",
        "message": "Direction must be one of NORTH, EAST, SOUTH, WEST.",
        "details": {"direction": "UP"},
    }


def test_execute_commands_returns_404_for_unknown_probe(client: TestClient) -> None:
    response = client.post(
        "/api/v1/probes/non-existent/commands",
        json={"commands": "M"},
    )

    assert response.status_code == 404
    assert response.json() == {
        "error": {
            "code": "probe_not_found",
            "message": "Probe 'non-existent' was not found.",
            "details": {"id": "non-existent"},
        },
    }


def test_failed_commands_return_422_and_leave_probe_state_unchanged(
    client: TestClient,
) -> None:
    launched = client.post(
        "/api/v1/probes",
        json={"x": 2, "y": 2, "direction": "NORTH"},
    ).json()
    probe_id = launched["id"]

    client.post(f"/api/v1/probes/{probe_id}/commands", json={"commands": "M"})

    invalid_cmd = client.post(
        f"/api/v1/probes/{probe_id}/commands",
        json={"commands": "MRX"},
    )
    assert invalid_cmd.status_code == 422
    assert invalid_cmd.json()["error"] == {
        "code": "invalid_command",
        "message": "Invalid command 'X' at index 2. Expected M, L, or R.",
        "details": {"index": 2, "command": "X"},
    }

    empty_cmd = client.post(
        f"/api/v1/probes/{probe_id}/commands",
        json={"commands": ""},
    )
    assert empty_cmd.status_code == 422
    assert empty_cmd.json()["error"]["code"] == "invalid_command"
    assert empty_cmd.json()["error"]["details"] == {}

    oob_cmd = client.post(
        f"/api/v1/probes/{probe_id}/commands",
        json={"commands": "MM"},
    )
    assert oob_cmd.status_code == 422
    assert oob_cmd.json()["error"] == {
        "code": "out_of_bounds",
        "message": "Command at index 1 moves probe to (0, 3), outside plateau (2, 2).",
        "details": {"index": 1, "x": 0, "y": 3, "max_x": 2, "max_y": 2},
    }

    probes = client.get("/api/v1/probes").json()["probes"]
    assert probes == [
        {
            "id": probe_id,
            "x": 0,
            "y": 1,
            "direction": "NORTH",
            "plateau": {"max_x": 2, "max_y": 2},
        },
    ]


def test_concurrent_http_movements_share_composition_root_lock() -> None:
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

    app = create_app(repository=CoordinatedRepository())
    client = TestClient(app)

    probe_id = client.post(
        "/api/v1/probes",
        json={"x": 5, "y": 5, "direction": "NORTH"},
    ).json()["id"]

    def first_request() -> dict[str, object]:
        response = client.post(
            f"/api/v1/probes/{probe_id}/commands",
            json={"commands": "M"},
        )
        assert response.status_code == 200
        return response.json()

    def second_request() -> dict[str, object]:
        assert first_entered_get.wait(timeout=2.0)
        second_started.set()
        response = client.post(
            f"/api/v1/probes/{probe_id}/commands",
            json={"commands": "M"},
        )
        assert response.status_code == 200
        return response.json()

    with ThreadPoolExecutor(max_workers=2) as pool:
        first_future = pool.submit(first_request)
        second_future = pool.submit(second_request)
        first_future.result(timeout=2.0)
        second_result = second_future.result(timeout=2.0)

    assert events == ["get:0", "update:1", "get:1", "update:2"]
    assert second_result == {
        "id": probe_id,
        "x": 0,
        "y": 2,
        "direction": "NORTH",
        "plateau": {"max_x": 5, "max_y": 5},
    }
