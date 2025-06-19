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
    # The expected JSON format from Map.tsx:
    # {
    #   "signalId": ...,
    #   "name": ...,
    #   "lat": ...,
    #   "lng": ...,W
    #   "distance": ...
    # }
    print("Received proximity log:", data)
    # You can access fields like:
    # signal_id = data.get("signalId")
    # name = data.get("name")
    # lat = data.get("lat")
    # lng = data.get("lng")
    # distance = data.get("distance")
    return JSONResponse(content={"status": "received", "data": data})

# If you want to use the Pydantic model:
@router.post("/iot/proximity/model")
async def handle_proximity_model(log: ProximityLog, request: Request):
    # Example: access app.state.iot_manager if needed
    # iot_manager = request.app.state.iot_manager
    # iot_manager.handle_proximity(log.dict())
    print("Received proximity log (model):", log.dict())
    return {"status": "ok"}