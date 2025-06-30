"""
FastAPI backend for YOLOv8 inference and integration with your React dashboard.

Features:
- Accepts video/image uploads for analysis.
- Loads your trained YOLOv8 model (best.pt).
- Runs detection and returns results in the format your frontend expects.
- (Optional) Provides endpoints for real-time detection and signal control.

Requirements:
pip install fastapi uvicorn ultralytics python-multipart opencv-python

Place your best.pt file in the backend directory or update the path below.
"""

import os
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO
import shutil
import uuid
import cv2
import torch

app = FastAPI()

# Allow CORS for local frontend dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# CUDA check and config
if torch.cuda.is_available():
    device = "cuda"
    print("CUDA is available. Using GPU for YOLOv8 inference.")
else:
    device = "cpu"
    print("CUDA not available. Using CPU for YOLOv8 inference.")

MODEL_PATH = "best.pt"  # Update if needed
model = YOLO(MODEL_PATH)
model.to(device)  # Ensure model is loaded on the correct device

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.post("/api/analyze")
async def analyze_videos(
    video_0: UploadFile = File(...),
    camera_angle_0: str = Form(...),
    video_1: UploadFile = File(...),
    camera_angle_1: str = Form(...),
    video_2: UploadFile = File(...),
    camera_angle_2: str = Form(...),
    video_3: UploadFile = File(...),
    camera_angle_3: str = Form(...),
    intersection_id: str = Form(...)
):
    # Save videos and run detection on the first frame of each (for demo)
    videos = [
        (video_0, camera_angle_0),
        (video_1, camera_angle_1),
        (video_2, camera_angle_2),
        (video_3, camera_angle_3),
    ]
    detection_results = []
    for video_file, angle in videos:
        file_id = str(uuid.uuid4())
        save_path = os.path.join(UPLOAD_DIR, f"{file_id}_{video_file.filename}")
        with open(save_path, "wb") as f:
            shutil.copyfileobj(video_file.file, f)
        # Extract first frame for detection (for demo; you can process full video)
        cap = cv2.VideoCapture(save_path)
        ret, frame = cap.read()
        cap.release()
        if not ret:
            continue
        # Run YOLO detection
        results = model(frame)
        detections = []
        for r in results:
            for box in r.boxes:
                cls = int(box.cls[0])
                conf = float(box.conf[0])
                x, y, w, h = box.xywh[0].tolist()
                detections.append({
                    "class": int(cls),
                    "confidence": conf,
                    "x": x,
                    "y": y,
                    "width": w,
                    "height": h
                })
        # Example: count vehicles/ambulances (adjust class mapping as needed)
        vehicle_count = sum(1 for d in detections if d["class"] == 0)
        ambulance_count = sum(1 for d in detections if d["class"] == 1)
        detection_results.append({
            "camera_id": angle,
            "vehicles": vehicle_count,
            "ambulances": ambulance_count,
            "detections": detections
        })
    # Return a fake analysisId for demo
    return JSONResponse({"analysisId": str(uuid.uuid4()), "results": detection_results})

@app.post("/api/signal-control")
async def signal_control(data: dict):
    # Accepts signal control requests from frontend
    # For demo, just echo back with a success message
    return JSONResponse({"success": True, "message": "Signal control received", "timing": {"northSouth": 45, "eastWest": 45, "yellowDuration": 4}})

@app.get("/api/detection/{camera_id}")
async def get_detection(camera_id: str):
    # For demo, return a fake detection result
    return JSONResponse({
        "camera_id": camera_id,
        "timestamp": "2024-01-01T12:00:00Z",
        "detections": {
            "vehicles": 10,
            "pedestrians": 2,
            "congestion_level": 0.5,
            "avg_speed": 30.0,
            "queue_length": 5,
            "vehicle_types": {"cars": 8, "trucks": 1, "buses": 1, "motorcycles": 0},
            "bounding_boxes": []
        }
    })

# To run: uvicorn main:app --reload

