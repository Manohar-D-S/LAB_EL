#routes.py
# This file contains the FastAPI routes for handling IoT-related requests.

from fastapi import FastAPI, Request, APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
import math
from PIL import Image
import cv2
import numpy as np

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

def estimate_direction_from_position(signal_lat, signal_lng, junction_lat, junction_lng):
    """
    Estimate direction (N/E/S/W) based on signal and junction coordinates.
    North is up in the image.
    """
    dx = signal_lng - junction_lng
    dy = signal_lat - junction_lat
    angle = math.degrees(math.atan2(dx, -dy))  # -dy because image y increases downwards
    # Map angle to direction
    if -45 <= angle < 45:
        return "N"
    elif 45 <= angle < 135:
        return "E"
    elif angle >= 135 or angle < -135:
        return "S"
    else:
        return "W"

@router.post("/iot/proximity")
async def handle_proximity(request: Request):
    data = await request.json()
    iot_manager = request.app.state.iot_manager

    # If direction is missing, try to infer from marker size and position
    if not data.get("signalDirection") and not data.get("direction"):
        # Assume frontend sends a 'markerSize' and a list of all signals at the junction
        # Example: data["markerSize"], data["allSignals"] = [{lat, lng, markerSize, signalId}, ...]
        all_signals = data.get("allSignals")
        if all_signals:
            # Find the signal with the largest markerSize
            largest = max(all_signals, key=lambda s: s.get("markerSize", 0))
            # Use its lat/lng as the "main" signal
            signal_lat = largest.get("lat")
            signal_lng = largest.get("lng")
            # Estimate junction as average of all signals
            junction_lat = sum(s["lat"] for s in all_signals) / len(all_signals)
            junction_lng = sum(s["lng"] for s in all_signals) / len(all_signals)
            direction = estimate_direction_from_position(signal_lat, signal_lng, junction_lat, junction_lng)
            data["direction"] = direction
        else:
            # fallback: use fixed junction as before
            signal_lat = data.get("lat")
            signal_lng = data.get("lng")
            junction_lat = 12.9873
            junction_lng = 77.5195
            direction = estimate_direction_from_position(signal_lat, signal_lng, junction_lat, junction_lng)
            data["direction"] = direction

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

# Required libraries for this file:
# fastapi
# pydantic
# numpy
# pillow
# opencv-python

# Install with:
# pip install fastapi pydantic numpy pillow opencv-python