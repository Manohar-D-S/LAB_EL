from iot.signal_processor import SignalProcessor
from server.core.iot.esp32 import ESP32Communicator
from iot.models import ProximityLog

class IOTManager:
    def __init__(self, graph, esp32_ip_map: dict):
        self.signal_processor = SignalProcessor(graph)
        self.communicator = ESP32Communicator(esp32_ip_map)

    async def handle_proximity_log(self, log: ProximityLog):
        commands = self.signal_processor.prioritize_signals(log)
        results = []
        for command in commands:
            success = await self.communicator.send_command(command)
            results.append({"command": command, "success": success})
        return results