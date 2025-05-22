from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class SignalMetadata(BaseModel):
    signal_id: str
    name: Optional[str] = None
    lat: float
    lng: float
    distance_meters: float
    direction: Optional[str] = None

class ProximityLog(BaseModel):
    ambulance_position: List[float]
    signals: List[SignalMetadata]

class ESP32Command(BaseModel):
    command: str
    signal_id: str
    distance_meters: float
    timestamp: str

class SignalProximityData(BaseModel):
    signalId: Optional[str] = None  # OSM node ID or custom ID
    name: Optional[str] = None
    lat: float
    lng: float
    distance: float  # Distance from ambulance to this signal in meters
    direction: Optional[str] = None  # Direction this signal controls (e.g., "north", "east", etc.)
    ambulanceDirection: Optional[float] = None

class AmbulanceProximityEvent(BaseModel):
    ambulanceId: str  # Unique ID for the ambulance (e.g., "AMB-001")
    currentPosition: Dict[str, float]  # {"lat": ..., "lng": ...}
    nearbySignals: List[SignalProximityData]  # List of ALL signals within the proximity threshold

class ESP32Command(BaseModel):
    command: str  # e.g., "set_green", "set_red", "get_status"
    signal_id: str  # The ID of the target signal (This should match the keys in your esp32_ip_map)
    duration: Optional[int] = None  # e.g., how long to stay green in seconds
    direction: Optional[str] = None  # Optional: direction of approach (e.g., "northbound")