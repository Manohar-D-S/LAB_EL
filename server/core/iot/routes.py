from fastapi import APIRouter, Depends
from iot.models import ProximityLog
from iot.iot import IOTManager
from typing import Any

router = APIRouter(prefix="/iot")

# Inject the IOTManager (initialize with graph and ESP32 IP map)
def get_iot_manager():
    # Replace with actual graph and ESP32 IP mapping
    from main import graph  # Import your OSMnx graph
    esp32_ip_map = {"SIG-001": "192.168.1.100", "SIG-002": "192.168.1.101"}
    return IOTManager(graph, esp32_ip_map)

@router.post("/proximity")
async def handle_proximity(log: ProximityLog, iot_manager: IOTManager = Depends(get_iot_manager)):
    results = await iot_manager.handle_proximity_log(log)
    return {"results": results}