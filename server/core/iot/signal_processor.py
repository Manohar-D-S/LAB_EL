from iot.models import ProximityLog, ESP32Command
from typing import List
import math
def calculate_distance(lat1, lng1, lat2, lng2):
    # Haversine formula to calculate distance between two lat/lng points in meters
    R = 6371000  # Radius of Earth in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lng2 - lng1)
    a = math.sin(delta_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

class SignalProcessor:
    def __init__(self, graph):
        self.graph = graph  # OSMnx graph loaded from route calculation
        self.graph = graph  # OSMnx graph loaded from route calculation

    def prioritize_signals(self, log: ProximityLog) -> List[ESP32Command]:
        """
        Determine which signals should turn green based on:
        - Ambulance route
        - Proximity logs
        - Traffic rules (e.g., prioritize main route)
        """
        commands = []
        
        # Example logic: Sort signals by distance and select the closest one
        sorted_signals = sorted(log.signals, key=lambda x: x.distance_meters)
        if sorted_signals:
            closest_signal = sorted_signals[0]
            commands.append(
                ESP32Command(
                    command="set_green",
                    signal_id=closest_signal.signal_id,
                    duration=10,  # Default duration
                    direction=closest_signal.direction
                )
            )
        
        return commands
    
    def prioritize_signal(self, ambulance_lat: float, ambulance_lng: float) -> dict:
        for signal in self.all_signals:
            signal["distance"] = calculate_distance(
                ambulance_lat, ambulance_lng,
                signal["lat"], signal["lng"]
            )

        # Sort and pick closest one within range
        sorted_signals = sorted(self.all_signals, key=lambda s: s.get("distance", float('inf')))
        return sorted_signals[0] if sorted_signals else None