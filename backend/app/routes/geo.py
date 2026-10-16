"""
Geospatial GeoJSON Layer Router & Phase 6 Hydraulic Drainage Flow Engine
Generates and serves GIS boundary polygons, flood inundation layers, drainage canals,
building footprint overlays, and Phase 6 hydraulic conduit flow accumulations.
"""
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException

from backend.app.agent2_geo import chronic_geo_engine
from backend.app.hydraulic import (
    hydraulic_controller,
    HydraulicSimulationRequest,
    HydraulicSimulationResponse,
    GeoContourModel
)

router = APIRouter(tags=["Geospatial Layers & Hydraulic Drainage"])


@router.get("/geo/layer/{event_id}")
async def get_geo_layer(
    event_id: str,
    lat: float = 19.0728,
    lon: float = 72.8797,
    depth_cm: int = 85,
    severity: str = "INFRASTRUCTURE_FAILURE"
) -> Dict[str, Any]:
    """
    Returns full GeoJSON FeatureCollection containing multi-tier flood inundation perimeter polygons,
    drainage outflow conduits, and exposed structural markers for Leaflet.js rendering.
    """
    return chronic_geo_engine.generate_geojson_layers(
        event_id=event_id,
        lat=lat,
        lon=lon,
        depth_cm=depth_cm,
        severity=severity
    )


@router.post("/geo/hydraulic/simulate", response_model=HydraulicSimulationResponse)
async def simulate_hydraulic_drainage(req: HydraulicSimulationRequest):
    """
    Phase 6 Hydraulic Waterlogging Depth Simulator & Municipal Stormwater Conduit Engine.
    Computes deterministic depth curves: D_water = max(0, (P_eff - C_drain)/10) * (1 + 1/(1+Slope))
    """
    try:
        return await hydraulic_controller.run_full_simulation(req)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Hydraulic simulation failure: {str(exc)}")


@router.get("/geo/hydraulic/conduits/{event_id}")
async def get_conduit_network(
    event_id: str,
    lat: float = 19.0760,
    lon: float = 72.8777,
    precipitation_mm_hr: float = 85.0,
    drainage_capacity_mm_hr: float = 35.0
):
    """
    Returns simulated trunk stormwater conduits and culvert surcharge ratios for a target coordinate.
    """
    conduits = hydraulic_controller.simulate_conduit_network(
        lat=lat,
        lon=lon,
        precipitation_mm_hr=precipitation_mm_hr,
        drainage_capacity_mm_hr=drainage_capacity_mm_hr
    )
    return {
        "event_id": event_id,
        "conduit_count": len(conduits),
        "conduits": [c.model_dump() for c in conduits],
        "chokepoints_detected": sum(1 for c in conduits if c.choke_status in ("SURCHARGED", "CRITICAL_BLOCKED"))
    }


@router.post("/geo/hydraulic/pipeline", response_model=GeoContourModel)
async def execute_phase6_pipeline(payload: Dict[str, Any]):
    """
    Standard PRD.md Section 16 Phase 6 Pipeline Execution Gate returning GeoContourModel.
    """
    try:
        return await hydraulic_controller.execute_phase_pipeline(payload)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Phase 6 pipeline error: {str(exc)}")
