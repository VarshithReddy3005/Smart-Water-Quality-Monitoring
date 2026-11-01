from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import Base, engine
from app.services.websocket_manager import ws_manager
from app.services.simulation_service import simulation_engine
from app.services.mqtt_service import mqtt_service

# Routers
from app.api.v1.auth import router as auth_router
from app.api.v1.stations import router as stations_router
from app.api.v1.devices import router as devices_router
from app.api.v1.sensors import router as sensors_router
from app.api.v1.readings import router as readings_router
from app.api.v1.alerts import router as alerts_router
from app.api.v1.assessments import router as assessments_router
from app.api.v1.wqi import router as wqi_router
from app.api.v1.reports import router as reports_router
from app.api.v1.simulation import router as simulation_router
from app.api.v1.users import router as users_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure tables exist
    Base.metadata.create_all(bind=engine)
    
    # Initialize background MQTT listener
    mqtt_service.start()
    
    # Initialize telemetry simulation engine if enabled
    if settings.SIMULATION_ENABLED_DEFAULT:
        simulation_engine.start(interval=settings.SIMULATION_INTERVAL_SECONDS)
        
    yield
    
    # Shutdown
    simulation_engine.stop()
    mqtt_service.stop()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="AquaGuard IoT Water Quality Monitoring and Management API",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(stations_router, prefix=settings.API_V1_STR)
app.include_router(devices_router, prefix=settings.API_V1_STR)
app.include_router(sensors_router, prefix=settings.API_V1_STR)
app.include_router(readings_router, prefix=settings.API_V1_STR)
app.include_router(alerts_router, prefix=settings.API_V1_STR)
app.include_router(assessments_router, prefix=settings.API_V1_STR)
app.include_router(wqi_router, prefix=settings.API_V1_STR)
app.include_router(reports_router, prefix=settings.API_V1_STR)
app.include_router(simulation_router, prefix=settings.API_V1_STR)
app.include_router(users_router, prefix=settings.API_V1_STR)

@app.websocket("/ws/live")
async def websocket_live_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep-alive ping/pong
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "AquaGuard Backend Core",
        "simulation_running": simulation_engine.is_running,
        "mqtt_connected": mqtt_service.is_connected
    }

@app.get("/")
def root():
    return {
        "project": settings.PROJECT_NAME,
        "version": "1.0.0",
        "documentation": "/docs",
        "api_v1": settings.API_V1_STR
    }
