import logging
from typing import List, Optional
from core.iot.models import SignalProximityData

logger = logging.getLogger(__name__)

def select_signal_to_set_green(signals: list, ambulance_direction: float) -> Optional['SignalProximityData']:
    """
    Decide which signal at a junction should be set green for the ambulance.
    Logic:
    - If signals have a 'direction' field and ambulance_direction is provided,
      select the signal whose direction is closest (in degrees) to the ambulance's direction.
    - If no direction info is available, select the closest signal (minimum distance).
    """
    if not signals:
        return None

    # Try to match by direction if available
    if ambulance_direction is not None and any(getattr(s, 'direction', None) for s in signals):
        def angle_diff(a, b):
            diff = abs((a - b + 180) % 360 - 180)
            return diff
        signals_with_dir = [s for s in signals if getattr(s, 'direction', None) is not None]
        if signals_with_dir:
            # Convert direction to float if needed
            best_signal = min(
                signals_with_dir,
                key=lambda s: angle_diff(float(s.direction), ambulance_direction)
            )
            return best_signal

    # Fallback: select the closest signal
    best_signal = min(signals, key=lambda s: getattr(s, 'distance', float('inf')))
    return best_signal

class SignalProcessor:
    def __init__(self, graph):
        self.graph = graph

    def process_proximity(self, data: dict) -> Optional[SignalProximityData]:
        """
        Process proximity data, select the best signal, and return it.
        """
        signalId = data.get("signalId")
        name = data.get("name")
        lat = data.get("lat")
        lng = data.get("lng")
        distance = data.get("distance")
        ambulanceDirection = data.get("ambulanceDirection")

        logger.info(f"Processing proximity: {name} - {distance}m")

        # Convert data to SignalProximityData
        signal_data = SignalProximityData(**data)

        # Select the signal to set green
        selected_signal = select_signal_to_set_green([signal_data], ambulanceDirection)

        if selected_signal:
            logger.info(f"Selected signal {selected_signal.signalId} to set green.")
        else:
            logger.warning("No signal selected.")

        return selected_signal