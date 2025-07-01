#!/usr/bin/env python3
"""
🚑 Ambulance Detection System
Core detector class for integrating with dashboard
"""

import cv2
import torch
import numpy as np
from ultralytics import YOLO
from pathlib import Path
import time
from typing import List, Dict, Tuple, Optional

class AmbulanceDetector:
    """Advanced Ambulance Detection System for Dashboard Integration"""
    
    def __init__(self, model_path: Optional[str] = None, device: str = 'auto'):
        """
        Initialize the ambulance detector
        
        Args:
            model_path: Path to trained model (optional)
            device: 'cuda', 'cpu', or 'auto'
        """
        self.device = self._setup_device(device)
        self.model = self._load_model(model_path)
        self.class_names = self.model.names
        
        # Detection settings
        self.confidence_threshold = 0.25
        self.nms_threshold = 0.45
        
        # Statistics
        self.total_detections = 0
        self.session_start = time.time()
        
        print(f"✅ Ambulance Detector initialized")
        print(f"🚑 Classes: {list(self.class_names.values())}")
        print(f"⚡ Device: {self.device}")
    
    def _setup_device(self, device: str) -> str:
        """Setup computation device"""
        if device == 'auto':
            if torch.cuda.is_available():
                device = 'cuda'
                print(f"🚀 CUDA detected: {torch.cuda.get_device_name()}")
            else:
                device = 'cpu'
                print(f"💻 Using CPU")
        return device
    
    def _load_model(self, model_path: Optional[str]) -> YOLO:
        """Load the trained model"""
        if model_path is None:
            # Try multiple model paths
            possible_paths = [
                "models/ambulance_model.pt",
                "../models/ambulance_model.pt",
                "ambulance_model.pt",
                "models/yolov8n.pt"
            ]
            
            for path in possible_paths:
                if Path(path).exists():
                    model_path = path
                    break
            
            if model_path is None:
                raise FileNotFoundError("❌ No ambulance model found!")
        
        model = YOLO(model_path)
        model.to(self.device)
        
        print(f"📂 Model loaded: {model_path}")
        return model
    
    def detect_frame(self, frame: np.ndarray) -> Dict:
        """
        Detect ambulances in a single frame
        
        Args:
            frame: Input image/frame
            
        Returns:
            Dictionary with detection results
        """
        start_time = time.time()
        
        # Run detection
        results = self.model(frame, verbose=False, 
                           conf=self.confidence_threshold,
                           iou=self.nms_threshold)
        
        # Process results
        detections = []
        ambulance_count = 0
        
        if results[0].boxes is not None:
            for box in results[0].boxes:
                # Extract detection info
                conf = float(box.conf[0])
                cls = int(box.cls[0])
                class_name = self.class_names[cls]
                
                # Get bounding box coordinates
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                
                detection = {
                    'class_id': cls,
                    'class_name': class_name,
                    'confidence': conf,
                    'bbox': {
                        'x1': int(x1), 'y1': int(y1),
                        'x2': int(x2), 'y2': int(y2),
                        'width': int(x2 - x1),
                        'height': int(y2 - y1)
                    }
                }
                
                detections.append(detection)
                
                # Count ambulances
                if 'ambulance' in class_name.lower():
                    ambulance_count += 1
        
        # Calculate processing time
        processing_time = time.time() - start_time
        fps = 1.0 / processing_time if processing_time > 0 else 0
        
        self.total_detections += len(detections)
        
        return {
            'detections': detections,
            'ambulance_count': ambulance_count,
            'total_detections': len(detections),
            'processing_time': processing_time,
            'fps': fps,
            'frame_shape': frame.shape,
            'timestamp': time.time()
        }
    
    def detect_video(self, video_path: str, save_output: bool = True) -> Dict:
        """
        Process entire video for ambulance detection
        
        Args:
            video_path: Path to video file
            save_output: Whether to save annotated video
            
        Returns:
            Complete video analysis results
        """
        cap = cv2.VideoCapture(video_path)
        
        if not cap.isOpened():
            raise ValueError(f"❌ Cannot open video: {video_path}")
        
        # Video properties
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS)
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        
        # Setup video writer if saving
        output_writer = None
        if save_output:
            output_path = f"output/{Path(video_path).stem}_detected.mp4"
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            output_writer = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
        
        # Process video
        frame_results = []
        total_ambulances = 0
        frame_count = 0
        
        print(f"🎥 Processing video: {video_path}")
        print(f"📊 Frames: {total_frames}, FPS: {fps}")
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            # Detect in current frame
            result = self.detect_frame(frame)
            result['frame_number'] = frame_count
            frame_results.append(result)
            
            total_ambulances += result['ambulance_count']
            
            # Draw annotations if saving
            if save_output and output_writer:
                annotated_frame = self.draw_detections(frame, result['detections'])
                output_writer.write(annotated_frame)
            
            frame_count += 1
            
            # Progress update
            if frame_count % 30 == 0:
                progress = (frame_count / total_frames) * 100
                print(f"📈 Progress: {progress:.1f}% | Ambulances: {total_ambulances}")
        
        cap.release()
        if output_writer:
            output_writer.release()
        
        # Video analysis summary
        avg_fps = len(frame_results) / sum(r['processing_time'] for r in frame_results)
        frames_with_ambulances = sum(1 for r in frame_results if r['ambulance_count'] > 0)
        
        return {
            'video_path': video_path,
            'total_frames': total_frames,
            'frames_processed': len(frame_results),
            'total_ambulances': total_ambulances,
            'frames_with_ambulances': frames_with_ambulances,
            'detection_rate': frames_with_ambulances / total_frames if total_frames > 0 else 0,
            'average_fps': avg_fps,
            'frame_results': frame_results,
            'video_info': {
                'width': width, 'height': height,
                'fps': fps, 'duration': total_frames / fps
            }
        }
    
    def draw_detections(self, frame: np.ndarray, detections: List[Dict]) -> np.ndarray:
        """Draw detection boxes and labels on frame"""
        annotated = frame.copy()
        
        for detection in detections:
            bbox = detection['bbox']
            class_name = detection['class_name']
            confidence = detection['confidence']
            
            # Colors for different classes
            if 'ambulance' in class_name.lower():
                color = (0, 255, 0)  # Green for ambulance
            else:
                color = (255, 0, 0)  # Blue for others
            
            # Draw bounding box
            cv2.rectangle(annotated, 
                         (bbox['x1'], bbox['y1']), 
                         (bbox['x2'], bbox['y2']), 
                         color, 2)
            
            # Draw label
            label = f"{class_name}: {confidence:.2f}"
            label_size = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)[0]
            
            cv2.rectangle(annotated, 
                         (bbox['x1'], bbox['y1'] - label_size[1] - 10),
                         (bbox['x1'] + label_size[0], bbox['y1']),
                         color, -1)
            
            cv2.putText(annotated, label,
                       (bbox['x1'], bbox['y1'] - 5),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
        
        return annotated
    
    def get_statistics(self) -> Dict:
        """Get detector statistics"""
        uptime = time.time() - self.session_start
        
        return {
            'total_detections': self.total_detections,
            'uptime_seconds': uptime,
            'device': self.device,
            'model_classes': list(self.class_names.values()),
            'confidence_threshold': self.confidence_threshold,
            'nms_threshold': self.nms_threshold
        }
    
    def update_settings(self, confidence: Optional[float] = None, nms: Optional[float] = None):
        """Update detection settings"""
        if confidence is not None:
            self.confidence_threshold = confidence
        if nms is not None:
            self.nms_threshold = nms
        
        print(f"⚙️  Settings updated - Confidence: {self.confidence_threshold}, NMS: {self.nms_threshold}")

# Quick test function
def test_detector():
    """Quick test of the detector"""
    try:
        detector = AmbulanceDetector()
        print("✅ Detector test passed!")
        return True
    except Exception as e:
        print(f"❌ Detector test failed: {e}")
        return False

if __name__ == "__main__":
    test_detector()
