import asyncio
import logging
from typing import Any

logger: logging.Logger = logging.getLogger("uvicorn.error")


class ConnectionManager:
    """Manages SSE client subscriptions and broadcasts messages to all listeners."""

    def __init__(self) -> None:
        self._queues: list[asyncio.Queue] = []

    async def subscribe(self) -> asyncio.Queue:
        """Register a new SSE client and return its message queue."""
        q: asyncio.Queue = asyncio.Queue()
        self._queues.append(q)
        logger.info("SSE client connected (%d total)", len(self._queues))
        return q

    def unsubscribe(self, q: asyncio.Queue) -> None:
        """Remove a disconnected SSE client's queue."""
        try:
            self._queues.remove(q)
        except ValueError:
            pass
        logger.info("SSE client disconnected (%d total)", len(self._queues))

    async def broadcast(self, message: dict[str, Any]) -> None:
        """Send a JSON message to all connected SSE clients, pruning full queues."""
        dead: list[asyncio.Queue] = []
        for q in self._queues:
            try:
                q.put_nowait(message)
            except asyncio.QueueFull:
                dead.append(q)
        for q in dead:
            self._queues.remove(q)


manager = ConnectionManager()
