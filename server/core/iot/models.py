from pydantic import BaseModel
from typing import List, Optional

class SignalMetadata(BaseModel):
    signal_id: str
    distance_meters: float
    direction: str  # e.g., "northbound", "southbound"

class ProximityLog(BaseModel):
    ambulance_position: List[float]  # [lat, lng]
    signals: List[SignalMetadata]    # Signals within 150m
    timestamp: str                   # ISO 8601

class ESP32Command(BaseModel):
    command: str     # "set_green", "emergency_corridor", etc.
    signal_id: str
    duration: int    # Seconds
    direction: Optional[str] = None