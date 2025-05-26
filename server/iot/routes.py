#routes.py
# This file contains the FastAPI routes for handling IoT-related requests.

from fastapi import FastAPI, Request, APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional

app = FastAPI()

class ProximityLog(BaseModel):
    signalId: str
    name: Optional[str] = None
    lat: float
    lng: float
    distance: float

# Simple IOT Manager class
class IOTManager:
    def handle_proximity(self, log_data):
        print("Handling proximity:", log_data)

# Initialize and store in app.state
@app.on_event("startup")
def init_iot():
    app.state.iot_manager = IOTManager()

router = APIRouter()

@router.post("/iot/proximity")
async def handle_proximity(request: Request):
    data = await request.json()
    iot_manager = request.app.state.iot_manager
    selected_signal = iot_manager.signal_processor.process_proximity(data)

    if selected_signal:
        return JSONResponse(content={"status": "selected", "signal": selected_signal.__dict__})
    else:
        return JSONResponse(content={"status": "no_signal_selected"}, status_code=200)

# If you want to use the Pydantic model:
@router.post("/iot/proximity/model")
async def handle_proximity_model(log: ProximityLog, request: Request):
    # Example: access app.state.iot_manager if needed
    # iot_manager = request.app.state.iot_manager
    # iot_manager.handle_proximity(log.dict())
    print("Received proximity log (model):", log.dict())
    return {"status": "ok"}

@router.post("/iot/esp-ready")
async def esp_ready(request: Request):
    data = await request.json()
    print("ESP32 says ready:", data)
    # Respond to ESP32 so it can blink all LEDs
    # For debugging, print and return a simple JSON
    return JSONResponse(content={"status": "received"})