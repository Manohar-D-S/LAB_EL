#!/usr/bin/env python3
"""
🚑 Ambulance Detection API Backend
FastAPI server for dashboard integration with YOLOv8 ambulance detection
"""

import os
import uuid
import shutil
import asyncio
from pathlib import Path
from typing import List, Optional
import sys

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn

# Add the parent directory of 'detection' to sys.path so FastAPI can import it
sys.path.append(str(Path(__file__).resolve().parent.parent))

# Import our custom detector
from detection.ambulance_detector import AmbulanceDetector

# Initialize FastAPI app
app = FastAPI(
    title="🚑 Ambulance Detection API",
    description="YOLOv8-based ambulance detection system for traffic management",
    version="1.0.0"
)

# CORS middleware for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global detector instance
detector = None
UPLOAD_DIR = "uploads"
OUTPUT_DIR = "output"

# Ensure directories exist
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Mount static files for serving results
app.mount("/static", StaticFiles(directory=OUTPUT_DIR), name="static")

@app.on_event("startup")
async def startup_event():
    """Initialize the ambulance detector on startup"""
    global detector
    try:
        detector = AmbulanceDetector()
        print("🚀 Ambulance Detection API started successfully!")
    except Exception as e:
        print(f"❌ Failed to initialize detector: {e}")
        detector = None

@app.get("/")
async def root():
    """API health check"""
    if detector is None:
        return {"status": "error", "message": "Detector not initialized"}
    
    stats = detector.get_statistics()
    return {
        "status": "running",
        "message": "🚑 Ambulance Detection API",
        "version": "1.0.0",
        "detector_stats": stats
    }

@app.post("/api/detect/image")
async def detect_image(file: UploadFile = File(...)):
    """
    Detect ambulances in uploaded image
    """
    if detector is None:
        raise HTTPException(status_code=500, detail="Detector not initialized")
    
    # Validate file type
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename required")
    
    try:
        # Save uploaded file
        file_id = str(uuid.uuid4())
        file_extension = Path(file.filename).suffix
        temp_path = Path(UPLOAD_DIR) / f"{file_id}{file_extension}"
        
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Read image for detection
        import cv2
        frame = cv2.imread(str(temp_path))
        
        if frame is None:
            raise HTTPException(status_code=400, detail="Invalid image file")
        
        # Run detection
        result = detector.detect_frame(frame)
        
        # Save annotated image
        annotated_frame = detector.draw_detections(frame, result['detections'])
        output_path = Path(OUTPUT_DIR) / f"{file_id}_detected{file_extension}"
        cv2.imwrite(str(output_path), annotated_frame)
        
        # Cleanup temp file
        temp_path.unlink()
        
        return {
            "success": True,
            "file_id": file_id,
            "ambulance_count": result['ambulance_count'],
            "total_detections": result['total_detections'],
            "processing_time": result['processing_time'],
            "detections": result['detections'],
            "output_url": f"/static/{file_id}_detected{file_extension}"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Detection failed: {str(e)}")

@app.post("/api/detect/video")
async def detect_video(file: UploadFile = File(...)):
    """
    Detect ambulances in uploaded video
    """
    if detector is None:
        raise HTTPException(status_code=500, detail="Detector not initialized")
    
    # Validate file type
    if not file.content_type or not file.content_type.startswith('video/'):
        raise HTTPException(status_code=400, detail="File must be a video")
    
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename required")
    
    try:
        # Save uploaded file
        file_id = str(uuid.uuid4())
        file_extension = Path(file.filename).suffix
        temp_path = Path(UPLOAD_DIR) / f"{file_id}{file_extension}"
        
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Run video detection (this might take time)
        result = detector.detect_video(str(temp_path), save_output=True)
        
        # Cleanup temp file
        temp_path.unlink()
        
        return {
            "success": True,
            "file_id": file_id,
            "video_analysis": {
                "total_frames": result['total_frames'],
                "frames_processed": result['frames_processed'],
                "total_ambulances": result['total_ambulances'],
                "frames_with_ambulances": result['frames_with_ambulances'],
                "detection_rate": result['detection_rate'],
                "average_fps": result['average_fps']
            },
            "output_url": f"/static/{file_id}_detected.mp4"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Video detection failed: {str(e)}")

@app.post("/api/analyze/intersection")
async def analyze_intersection(
    video_north: UploadFile = File(...),
    video_south: UploadFile = File(...),
    video_east: UploadFile = File(...),
    video_west: UploadFile = File(...),
    intersection_id: str = Form(...)
):
    """
    Analyze 4-way intersection for ambulance detection
    """
    if detector is None:
        raise HTTPException(status_code=500, detail="Detector not initialized")
    
    videos = {
        'north': video_north,
        'south': video_south,
        'east': video_east,
        'west': video_west
    }
    
    results = {}
    analysis_id = str(uuid.uuid4())
    
    try:
        for direction, video_file in videos.items():
            if not video_file.filename:
                continue
                
            # Save video temporarily
            file_id = f"{analysis_id}_{direction}"
            file_extension = Path(video_file.filename).suffix
            temp_path = Path(UPLOAD_DIR) / f"{file_id}{file_extension}"
            
            with open(temp_path, "wb") as buffer:
                shutil.copyfileobj(video_file.file, buffer)
            
            # Analyze first few frames for quick response
            import cv2
            cap = cv2.VideoCapture(str(temp_path))
            
            frame_results = []
            total_ambulances = 0
            
            # Analyze first 30 frames (1 second at 30fps)
            frame_num = 0
            for frame_num in range(30):
                ret, frame = cap.read()
                if not ret:
                    break
                
                result = detector.detect_frame(frame)
                total_ambulances += result['ambulance_count']
                
                if result['ambulance_count'] > 0:
                    frame_results.append({
                        'frame_number': frame_num,
                        'ambulance_count': result['ambulance_count'],
                        'detections': result['detections']
                    })
            
            cap.release()
            temp_path.unlink()  # Cleanup
            
            # Store results for this direction
            results[direction] = {
                'camera_id': direction,
                'ambulance_count': total_ambulances,
                'ambulance_detected': total_ambulances > 0,
                'frames_analyzed': frame_num + 1,
                'detection_frames': frame_results
            }
        
        # Determine if emergency signal override is needed
        emergency_override = any(r['ambulance_detected'] for r in results.values())
        priority_direction = None
        
        if emergency_override:
            # Find direction with most ambulances
            max_ambulances = max(r['ambulance_count'] for r in results.values())
            for direction, result in results.items():
                if result['ambulance_count'] == max_ambulances:
                    priority_direction = direction
                    break
        
        return {
            "success": True,
            "analysis_id": analysis_id,
            "intersection_id": intersection_id,
            "emergency_override": emergency_override,
            "priority_direction": priority_direction,
            "results": results,
            "timestamp": detector.get_statistics()['uptime_seconds']
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Intersection analysis failed: {str(e)}")

@app.post("/api/signal-control")
async def signal_control(data: dict):
    """
    Handle signal control requests based on ambulance detection
    """
    analysis_id = data.get('analysis_id')
    priority_direction = data.get('priority_direction')
    emergency_override = data.get('emergency_override', False)
    
    if emergency_override and priority_direction:
        # Emergency signal timing
        signal_timing = {
            "emergency_mode": True,
            "priority_direction": priority_direction,
            "timing": {
                priority_direction: 60,  # Give more time to ambulance direction
                "cross_direction": 15,   # Minimal time for cross traffic
                "yellow_duration": 3,
                "all_red_duration": 2
            },
            "message": f"🚑 Emergency override: Priority to {priority_direction.upper()}"
        }
    else:
        # Normal signal timing
        signal_timing = {
            "emergency_mode": False,
            "timing": {
                "north_south": 45,
                "east_west": 45,
                "yellow_duration": 4,
                "all_red_duration": 1
            },
            "message": "🚦 Normal traffic signal operation"
        }
    
    return JSONResponse({
        "success": True,
        "analysis_id": analysis_id,
        "signal_control": signal_timing
    })

@app.get("/api/detector/stats")
async def get_detector_stats():
    """Get current detector statistics"""
    if detector is None:
        raise HTTPException(status_code=500, detail="Detector not initialized")
    
    return detector.get_statistics()

@app.post("/api/detector/settings")
async def update_detector_settings(
    confidence: Optional[float] = None,
    nms: Optional[float] = None
):
    """Update detector settings"""
    if detector is None:
        raise HTTPException(status_code=500, detail="Detector not initialized")
    
    # Only pass non-None values
    if confidence is not None or nms is not None:
        detector.update_settings(confidence=confidence, nms=nms)
    
    return {
        "success": True,
        "message": "Settings updated",
        "current_settings": {
            "confidence_threshold": detector.confidence_threshold,
            "nms_threshold": detector.nms_threshold
        }
    }

@app.get("/api/health")
async def health_check():
    """Detailed health check"""
    return {
        "api_status": "healthy",
        "detector_status": "initialized" if detector else "error",
        "cuda_available": detector.device == 'cuda' if detector else False,
        "uptime": detector.get_statistics()['uptime_seconds'] if detector else 0
    }

if __name__ == "__main__":
    # For development
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=5001,  # CHANGE THIS TO 5001 to match your frontend requests
        reload=True,
        log_level="info"
    )
