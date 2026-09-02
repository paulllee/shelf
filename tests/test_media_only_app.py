from pathlib import Path
from threading import Event

from fastapi import FastAPI
from fastapi.testclient import TestClient
from pytest import MonkeyPatch

import app.main as main


def write_media(path: Path, name: str = "Example") -> None:
    path.write_text(
        "\n".join(
            [
                "---",
                f"name: {name}",
                "country: america",
                "type: movie",
                "status: queued",
                'rating: "8"',
                "---",
                "review",
            ]
        ),
        encoding="utf-8",
    )


def write_config(path: Path) -> None:
    (path / "config.toml").write_text('media_dir = "./media"\n', encoding="utf-8")


def test_app_starts_with_only_media_routes(
    monkeypatch: MonkeyPatch, tmp_path: Path
) -> None:
    media_dir = tmp_path / "media"
    media_dir.mkdir()
    write_media(media_dir / "example.md")
    write_config(tmp_path)
    monkeypatch.chdir(tmp_path)

    with TestClient(main.app) as client:
        response = client.get("/api/media", params={"status": "queued"})
        assert response.status_code == 200
        assert [item["name"] for item in response.json()] == ["Example"]

        paths = set(client.get("/openapi.json").json()["paths"])

    assert "/api/media" in paths
    assert "/api/meta/enums" in paths
    assert "/events" in paths
    assert "/api/meta/views" not in paths
    assert not any(
        path.startswith(
            (
                "/api/workout",
                "/api/template",
                "/api/habit",
                "/api/activit",
                "/api/preset",
                "/api/task",
                "/api/chat",
            )
        )
        for path in paths
    )


def test_media_poll_reloads_markdown(monkeypatch: MonkeyPatch, tmp_path: Path) -> None:
    media_dir = tmp_path / "media"
    media_dir.mkdir()
    write_media(media_dir / "first.md", name="First")
    write_config(tmp_path)
    monkeypatch.chdir(tmp_path)
    monkeypatch.setattr(main, "POLL_INTERVAL_SECONDS", 0.01)

    refreshed = Event()
    refresh_media_items = main.refresh_media_items

    def observe_refresh(app: FastAPI) -> None:
        refresh_media_items(app)
        if len(app.state.media_items) == 2:
            refreshed.set()

    monkeypatch.setattr(main, "refresh_media_items", observe_refresh)

    with TestClient(main.app) as client:
        write_media(media_dir / "second.md", name="Second")
        assert refreshed.wait(timeout=1)
        response = client.get("/api/media", params={"status": "queued"})

    assert {item["name"] for item in response.json()} == {"First", "Second"}
