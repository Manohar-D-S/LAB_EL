from pydantic import BaseModel, Field
from typing import List, Dict, Any

class RouteRequest(BaseModel):
    """Request model for route calculation."""
    source_lat: float = Field(..., description="Source location latitude")
    source_lng: float = Field(..., description="Source location longitude")
    dest_lat: float = Field(..., description="Destination location latitude")
    dest_lng: float = Field(..., description="Destination location longitude")


class RouteCoordinate(BaseModel):
    """A single coordinate point."""
    lat: float
    lng: float


class AlgorithmComparison(BaseModel):
    """Model for algorithm performance comparison."""
    algorithm: str
    computation_time: float
    distance_km: float
    nodes_count: int


class RouteResponse(BaseModel):
    """Response model for route calculation."""
    route_coordinates: List[List[float]]
    distance_km: float
    time_mins: float
    computation_time: float
    algorithm_comparison: List[Dict[str, Any]]