from fastapi import APIRouter, Depends
from iot.models import ProximityLog, ESP32Command
from iot.iot import IOTManager
from typing import Any

router = APIRouter(prefix="/iot")

# Inject the IOTManager (initialize with graph and ESP32 IP map)
def get_iot_manager():
    # Replace with actual logic to load graph and ESP32 mapping
    from main import graph  # Import your OSMnx graph
    esp32_ip_map = {
        "SIG-001": "http://192.168.43.100/traffic-light-control",  # ESP32 1
        "SIG-002": "http://192.168.43.101/traffic-light-control",  # ESP32 2
    }
    return IOTManager(graph, esp32_ip_map)

@router.post("/proximity")
async def handle_proximity(log: ProximityLog, iot_manager: IOTManager = Depends(get_iot_manager)):
    print("Received proximity log:", log.dict())

    try:
        # Ask IOTManager to process and send commands to ESP32(s)
        results = await iot_manager.handle_proximity_log(log)
        
        return {"status": "success", "results": results}
    
    except Exception as e:
        return {"status": "failed", "error": str(e)}