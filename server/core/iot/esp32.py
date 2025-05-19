from iot.models import ProximityLog, ESP32Command
from typing import List

class SignalProcessor:
    def __init__(self, graph):
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