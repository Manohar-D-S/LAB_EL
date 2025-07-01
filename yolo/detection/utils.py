#!/usr/bin/env python3
"""
🛠️ Detection Utilities
Helper functions for ambulance detection system
"""

import cv2
import numpy as np
import time
from pathlib import Path
from typing import List, Dict, Tuple, Union
import yaml

def load_config(config_path: str = "config/data.yaml") -> Dict:
    """Load configuration from YAML file"""
    try:
        with open(config_path, 'r') as f:
            config = yaml.safe_load(f)
        return config
    except FileNotFoundError:
        print(f"⚠️  Config file not found: {config_path}")
        return get_default_config()

def get_default_config() -> Dict:
    """Get default configuration"""
    return {
        'names': {0: 'ambulance'},
        'nc': 1,
        'confidence_threshold': 0.25,
        'nms_threshold': 0.45,
        'colors': {'ambulance': [0, 255, 0]},
        'api_host': '0.0.0.0',
        'api_port': 8000
    }

def format_time(seconds: float) -> str:
    """Format time in human readable format"""
    if seconds < 60:
        return f"{seconds:.1f}s"
    elif seconds < 3600:
        minutes = seconds // 60
        secs = seconds % 60
        return f"{int(minutes)}m {secs:.1f}s"
    else:
        hours = seconds // 3600
        minutes = (seconds % 3600) // 60
        return f"{int(hours)}h {int(minutes)}m"

def calculate_fps(processing_times: List[float]) -> float:
    """Calculate average FPS from processing times"""
    if not processing_times:
        return 0.0
    avg_time = sum(processing_times) / len(processing_times)
    return 1.0 / avg_time if avg_time > 0 else 0.0

def validate_video_file(video_path: Union[str, Path]) -> bool:
    """Validate if video file is readable"""
    try:
        cap = cv2.VideoCapture(str(video_path))
        if not cap.isOpened():
            return False
        
        # Try to read first frame
        ret, _ = cap.read()
        cap.release()
        return ret
    except Exception:
        return False

def get_video_info(video_path: Union[str, Path]) -> Dict:
    """Get video file information"""
    cap = cv2.VideoCapture(str(video_path))
    
    if not cap.isOpened():
        return {}
    
    info = {
        'width': int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)),
        'height': int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)),
        'fps': cap.get(cv2.CAP_PROP_FPS),
        'total_frames': int(cap.get(cv2.CAP_PROP_FRAME_COUNT)),
        'duration': 0
    }
    
    if info['fps'] > 0:
        info['duration'] = info['total_frames'] / info['fps']
    
    cap.release()
    return info

def resize_frame(frame: np.ndarray, target_width: int = 640) -> np.ndarray:
    """Resize frame while maintaining aspect ratio"""
    height, width = frame.shape[:2]
    
    if width == target_width:
        return frame
    
    # Calculate new height maintaining aspect ratio
    aspect_ratio = height / width
    target_height = int(target_width * aspect_ratio)
    
    return cv2.resize(frame, (target_width, target_height))

def draw_detection_info(frame: np.ndarray, detections: List[Dict], 
                       show_confidence: bool = True) -> np.ndarray:
    """Draw detection information on frame"""
    annotated = frame.copy()
    
    # Draw detection count
    ambulance_count = sum(1 for d in detections if 'ambulance' in d['class_name'].lower())
    
    # Background for text
    cv2.rectangle(annotated, (10, 10), (300, 80), (0, 0, 0), -1)
    
    # Text info
    cv2.putText(annotated, f"Ambulances: {ambulance_count}", 
               (20, 35), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
    
    cv2.putText(annotated, f"Total detections: {len(detections)}", 
               (20, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
    
    return annotated

def create_detection_summary(results: List[Dict]) -> Dict:
    """Create summary statistics from detection results"""
    if not results:
        return {}
    
    total_frames = len(results)
    total_ambulances = sum(r.get('ambulance_count', 0) for r in results)
    frames_with_ambulances = sum(1 for r in results if r.get('ambulance_count', 0) > 0)
    
    processing_times = [r.get('processing_time', 0) for r in results]
    avg_fps = calculate_fps(processing_times)
    
    return {
        'total_frames': total_frames,
        'total_ambulances': total_ambulances,
        'frames_with_ambulances': frames_with_ambulances,
        'detection_rate': frames_with_ambulances / total_frames if total_frames > 0 else 0,
        'average_fps': avg_fps,
        'total_processing_time': sum(processing_times),
        'max_ambulances_per_frame': max((r.get('ambulance_count', 0) for r in results), default=0)
    }

def save_detection_log(results: List[Dict], output_path: str):
    """Save detection results to log file"""
    with open(output_path, 'w') as f:
        f.write("🚑 AMBULANCE DETECTION LOG\n")
        f.write("=" * 50 + "\n\n")
        
        summary = create_detection_summary(results)
        
        f.write(f"📊 SUMMARY:\n")
        f.write(f"Total frames: {summary.get('total_frames', 0)}\n")
        f.write(f"Ambulances detected: {summary.get('total_ambulances', 0)}\n")
        f.write(f"Frames with ambulances: {summary.get('frames_with_ambulances', 0)}\n")
        f.write(f"Detection rate: {summary.get('detection_rate', 0):.2%}\n")
        f.write(f"Average FPS: {summary.get('average_fps', 0):.1f}\n")
        f.write(f"Processing time: {format_time(summary.get('total_processing_time', 0))}\n\n")
        
        f.write(f"📋 DETAILED RESULTS:\n")
        for i, result in enumerate(results):
            if result.get('ambulance_count', 0) > 0:
                f.write(f"Frame {i}: {result['ambulance_count']} ambulance(s) "
                       f"(confidence: {result.get('confidence', 'N/A')})\n")

def check_model_file(model_path: str) -> bool:
    """Check if model file exists and is valid"""
    path = Path(model_path)
    
    if not path.exists():
        return False
    
    if path.suffix != '.pt':
        return False
    
    # Check file size (should be > 1MB for a real model)
    if path.stat().st_size < 1024 * 1024:
        return False
    
    return True

def emergency_signal_logic(detection_results: Dict) -> Dict:
    """
    Determine emergency signal override based on detection results
    
    Args:
        detection_results: Results from intersection analysis
        
    Returns:
        Signal control commands
    """
    config = load_config()
    threshold = config.get('emergency_detection_threshold', 1)
    
    # Check each direction for ambulances
    emergency_directions = []
    
    for direction, result in detection_results.items():
        ambulance_count = result.get('ambulance_count', 0)
        if ambulance_count >= threshold:
            emergency_directions.append(direction)
    
    if emergency_directions:
        # Emergency mode: prioritize direction with most ambulances
        max_ambulances = 0
        priority_direction = emergency_directions[0]
        
        for direction in emergency_directions:
            ambulance_count = detection_results[direction].get('ambulance_count', 0)
            if ambulance_count > max_ambulances:
                max_ambulances = ambulance_count
                priority_direction = direction
        
        return {
            'emergency_mode': True,
            'priority_direction': priority_direction,
            'emergency_directions': emergency_directions,
            'signal_timing': {
                priority_direction: config.get('priority_signal_duration', 60),
                'cross_directions': 15,
                'yellow_duration': config.get('yellow_duration', 4),
                'all_red_duration': config.get('all_red_duration', 2)
            },
            'message': f"🚑 EMERGENCY: Ambulance detected in {priority_direction.upper()}"
        }
    else:
        # Normal mode
        return {
            'emergency_mode': False,
            'signal_timing': {
                'north_south': config.get('normal_signal_duration', 45),
                'east_west': config.get('normal_signal_duration', 45),
                'yellow_duration': config.get('yellow_duration', 4),
                'all_red_duration': config.get('all_red_duration', 2)
            },
            'message': "🚦 Normal traffic signal operation"
        }

def benchmark_model(detector, test_images: List[str] = None) -> Dict:
    """Benchmark model performance"""
    if test_images is None:
        # Use sample images if available
        test_images = list(Path("test_images").glob("*.jpg"))[:10]
    
    if not test_images:
        return {"error": "No test images available"}
    
    processing_times = []
    total_detections = 0
    
    for img_path in test_images:
        frame = cv2.imread(str(img_path))
        if frame is None:
            continue
        
        start_time = time.time()
        result = detector.detect_frame(frame)
        processing_time = time.time() - start_time
        
        processing_times.append(processing_time)
        total_detections += result['total_detections']
    
    if not processing_times:
        return {"error": "No valid images processed"}
    
    return {
        'images_processed': len(processing_times),
        'total_detections': total_detections,
        'average_fps': calculate_fps(processing_times),
        'min_fps': 1.0 / max(processing_times),
        'max_fps': 1.0 / min(processing_times),
        'average_processing_time': sum(processing_times) / len(processing_times)
    }
