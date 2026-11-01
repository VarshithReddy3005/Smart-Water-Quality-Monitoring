import json
from typing import List, Dict, Any
from fastapi import WebSocket

class WebSocketManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast_reading(self, reading_data: Dict[str, Any]):
        """Broadcasts incoming live telemetry reading to all connected UI clients."""
        payload = {
            "type": "NEW_READING",
            "data": reading_data
        }
        await self._broadcast_json(payload)

    async def broadcast_alert(self, alert_data: Dict[str, Any]):
        """Broadcasts generated alert immediately to UI clients for live notification."""
        payload = {
            "type": "NEW_ALERT",
            "data": alert_data
        }
        await self._broadcast_json(payload)

    async def broadcast_status(self, status_data: Dict[str, Any]):
        """Broadcasts station status or simulation state changes."""
        payload = {
            "type": "STATUS_UPDATE",
            "data": status_data
        }
        await self._broadcast_json(payload)

    async def _broadcast_json(self, payload: Dict[str, Any]):
        dead_connections = []
        message = json.dumps(payload, default=str)
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception:
                dead_connections.append(connection)
        
        for dead in dead_connections:
            self.disconnect(dead)

ws_manager = WebSocketManager()
