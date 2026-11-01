from fastapi import APIRouter, HTTPException
from app.schemas.simulation import SimulationConfig, SimulationControlRequest
from app.services.simulation_service import simulation_engine

router = APIRouter(prefix="/simulation", tags=["Simulation Engine Controls"])

@router.get("/status")
def get_simulation_status():
    return simulation_engine.get_status()

@router.post("/control")
def control_simulation(req: SimulationControlRequest):
    act = req.action.lower()
    if act == "start":
        simulation_engine.start(interval=req.interval_seconds, scenario=req.scenario)
    elif act == "stop":
        simulation_engine.stop()
    elif act == "pause":
        simulation_engine.pause()
    elif act == "resume":
        simulation_engine.resume()
    elif act == "set_scenario":
        if req.scenario:
            simulation_engine.set_scenario(req.scenario)
    elif act == "set_interval":
        if req.interval_seconds:
            simulation_engine.interval_seconds = max(1, min(60, req.interval_seconds))
    else:
        raise HTTPException(status_code=400, detail=f"Unknown action: {req.action}")

    return simulation_engine.get_status()

@router.get("/scenarios")
def get_available_scenarios():
    return [
        {
            "id": "nominal",
            "name": "Nominal Baseline",
            "description": "Standard seasonal diurnal oscillation with clean drinking water parameters.",
            "impact": "All readings within Normal thresholds; WQI categorized as Excellent/Good."
        },
        {
            "id": "rainfall_runoff",
            "name": "Heavy Rainfall & Soil Runoff",
            "description": "Sudden surge in surface sediment causing extreme Turbidity (>30 NTU) and rising TDS.",
            "impact": "Triggers Turbidity Warning/Critical alerts."
        },
        {
            "id": "chemical_spill",
            "name": "Industrial Acid Spill",
            "description": "Acidic effluent discharge forcing pH to drop drastically to ~4.2 with elevated EC.",
            "impact": "Triggers Critical pH alert and drops WQI score into 'Unsuitable'."
        },
        {
            "id": "algal_bloom",
            "name": "Eutrophic Algal Bloom",
            "description": "Daytime alkaline pH (>9.0) followed by severe nighttime Dissolved Oxygen hypoxia (<2.5 mg/L).",
            "impact": "Triggers DO and Ammonia Warning/Critical alerts."
        },
        {
            "id": "sensor_drift",
            "name": "Sensor Calibration Drift",
            "description": "Simulates gradual electrochemical degradation and measurement drift on glass electrode.",
            "impact": "Demonstrates detection of anomalous continuous sensor bias."
        }
    ]
