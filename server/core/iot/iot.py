# from iot.signal_processor import SignalProcessor
# from server.core.iot.esp32 import ESP32Communicator
# from iot.models import ProximityLog

# class IOTManager:
#     def __init__(self, graph, esp32_ip_map: dict):
#         self.signal_processor = SignalProcessor(graph)
#         self.communicator = ESP32Communicator(esp32_ip_map)

#     async def handle_proximity_log(self, log: ProximityLog):
#         commands = self.signal_processor.prioritize_signals(log)
#         results = []
#         for command in commands:
#             success = await self.communicator.send_command(command)
#             results.append({"command": command, "success": success})
#         return results

# server/core/iot/iot.py
import httpx
from typing import List

class IOTManager:
    def __init__(self, graph):
        self.graph = graph
        # Only one ESP32 now
        self.esp32_url = "http://192.168.43.100/traffic-light-control"

    async def handle_proximity_log(self, log):
        """
        Receives proximity log from ambulance and sends command to ESP32
        if ambulance is close enough to any signal.
        """
        results = []

        # For now, assume we want to activate all nearby signals
        for signal in log.signals:
            success = await self.send_to_esp32(signal)
            results.append({
                "signal_id": signal.signal_id,
                "success": success
            })

        return results

    async def send_to_esp32(self, signal):
        """
        Sends JSON command to ESP32
        """
        command = {
            "command": "set_green",
            "signal_id": signal.signal_id,
            "distance_meters": signal.distance_meters,
            "timestamp": log_now()  # See below
        }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(self.esp32_url, json=command, timeout=5.0)
                print(f"Sent to ESP32. Status: {response.status_code}")
                return True
        except Exception as e:
            print(f"Failed to send to ESP32: {e}")
            return False


def log_now():
    from datetime import datetime
    return datetime.utcnow().isoformat() + "Z"