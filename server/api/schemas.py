from pydantic import BaseModel
from typing import List, Tuple, Dict, Optional

class RouteRequest(BaseModel):
    source_lat: float
    source_lng: float
    dest_lat: float
    dest_lng: float

class RouteResponse(BaseModel):
    path: List[Tuple[float, float]]
    distance: float  # in kilometers
    duration: float  # in minutes
    road_types: Dict[str, float]  # road type distribution in meters
    visualization_url: Optional[str]