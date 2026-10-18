"""
TERRA-SENTINEL: Crisis Cleanup 4R Collaborative Relief Router
Phase 29.3: Inter-Agency Disaster Relief Work Order REST API Endpoints
"""

import logging
from typing import List, Optional
from fastapi import APIRouter, Query, HTTPException, Path
from backend.app.crisis_cleanup import (
    crisis_cleanup_engine,
    ReliefCase,
    ReliefCaseCreate,
    ClaimCaseRequest,
    UpdateWorkRequest,
    CloseCaseRequest,
    CaseStatus,
    PriorityTier,
    ReliefAgency
)

logger = logging.getLogger("terra_sentinel.routes.relief")

router = APIRouter(tags=["Crisis Cleanup 4R Collaborative Relief"])


@router.post("/relief/cases", response_model=ReliefCase)
async def create_relief_case(data: ReliefCaseCreate):
    """
    Creates an actionable disaster relief work order from a verified incident or survivor dispatch.
    Automatically calculates vulnerability priority score and recommends matching rescue vehicle.
    """
    try:
        return crisis_cleanup_engine.create_case(data)
    except Exception as e:
        logger.error(f"Error creating relief case: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Case creation error: {str(e)}")


@router.get("/relief/cases", response_model=List[ReliefCase])
async def list_relief_cases(
    status: Optional[CaseStatus] = Query(None, description="Filter by case lifecycle status"),
    agency: Optional[ReliefAgency] = Query(None, description="Filter by claiming relief agency"),
    priority_tier: Optional[PriorityTier] = Query(None, description="Filter by priority level"),
    limit: int = Query(50, ge=1, le=200, description="Max cases to return")
):
    """
    Returns prioritized disaster recovery work orders sorted by vulnerability score.
    """
    return crisis_cleanup_engine.list_cases(
        status=status,
        agency=agency,
        priority_tier=priority_tier,
        limit=limit
    )


@router.get("/relief/cases/{case_id}", response_model=ReliefCase)
async def get_relief_case_by_id(
    case_id: str = Path(..., description="Unique case identifier (e.g. CC-MUM-101)")
):
    """
    Retrieves full details of a relief case including mutual-aid claim lease status.
    """
    c = crisis_cleanup_engine.get_case(case_id)
    if not c:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found")
    return c


@router.post("/relief/claim/{case_id}", response_model=ReliefCase)
async def claim_relief_case(
    case_id: str = Path(..., description="Case identifier to claim"),
    req: ClaimCaseRequest = ...
):
    """
    Claims a disaster relief case for an organization with a 24-hour mutual-aid lease lock.
    Prevents duplicate deployment of scarce rescue resources.
    """
    try:
        return crisis_cleanup_engine.claim_case(case_id, req)
    except ValueError as ve:
        raise HTTPException(status_code=409, detail=str(ve))
    except Exception as e:
        logger.error(f"Error claiming case {case_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Claim error: {str(e)}")


@router.post("/relief/work/{case_id}", response_model=ReliefCase)
async def update_relief_case_work(
    case_id: str = Path(..., description="Case identifier to update"),
    req: UpdateWorkRequest = ...
):
    """
    Updates operational on-site work progress, active volunteer count, and deployed equipment.
    """
    try:
        return crisis_cleanup_engine.update_work_progress(case_id, req)
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        logger.error(f"Error updating work on case {case_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/relief/close/{case_id}", response_model=ReliefCase)
async def close_relief_case(
    case_id: str = Path(..., description="Case identifier to close"),
    req: CloseCaseRequest = ...
):
    """
    Marks a disaster relief work order as completed and permanently closed with officer signoff.
    """
    try:
        return crisis_cleanup_engine.close_case(case_id, req)
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        logger.error(f"Error closing case {case_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/relief/spec")
async def get_relief_specification():
    """
    Returns architectural specifications and 4R workflow parameters for Crisis Cleanup engine.
    """
    return {
        "engine": "Crisis Cleanup 4R Collaborative Recovery Engine",
        "lifecycle_stages": ["REPORT", "CLAIM", "WORK", "CLOSE"],
        "lease_lock_duration_hours": 24,
        "priority_formula": "P = 0.30*V_vuln + 0.30*min(1.0, D_water/150cm) + 0.25*I(SpecialNeeds) + 0.15*I(AccessCutoff)",
        "participating_agencies": [
            "NDRF_BATTALION_5",
            "BMC_DISASTER_MANAGEMENT_CELL",
            "INDIAN_RED_CROSS_SOCIETY",
            "CIVIL_DEFENCE_CORPS",
            "KHALSA_AID_INDIA"
        ],
        "work_types": [
            "MUCK_OUT", "TARPING", "TREE_DEBRIS", "BIOHAZARD", "MEDICAL_EVAC", "ELDERLY_RESCUE", "FOOD_WATER_RELIEF"
        ],
        "active_cases_count": len(crisis_cleanup_engine._cases)
    }
