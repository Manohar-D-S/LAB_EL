from flask import Flask, Response, request, jsonify, send_from_directory
import cv2
import os
import threading
import time
from collections import Counter
from datetime import datetime

# Import run_detection from manju.py
from manju import run_detection, OUTPUT_DIR, FRAME_SAVE_DIR, VEHICLE_CLASSES, MAX_VEHICLE_COUNT, CAMERA_INDEX

app = Flask(__name__)
ANNOTATED_DIR = os.path.join(OUTPUT_DIR, "annotated")
os.makedirs(ANNOTATED_DIR, exist_ok=True)

# --- Live Feed State ---
live_stats = {
    "timestamp": "",
    "vehicleCount": 0,
    "ambulanceDetected": False,
    "congestionLevel": 0.0,
    "avgSpeed": 0,
    "queueLength": 0,
    "priority": 1
}

def gen_frames():
    # Use run_detection for live feed (camera index)
    cap = cv2.VideoCapture(CAMERA_INDEX)
    from ultralytics import YOLO
    model = YOLO("run/detect/train/weights/best.pt")
    while True:
        success, frame = cap.read()
        if not success:
            break
        results = model.predict(source=frame, conf=0.3, save=False, imgsz=640)
        annotated_frame = results[0].plot()
        # --- Update live_stats ---
        class_ids = results[0].boxes.cls.cpu().numpy().astype(int)
        class_names = [results[0].names[c] for c in class_ids]
        class_counter = Counter(class_names)
        vehicle_count = sum(class_counter.get(c, 0) for c in VEHICLE_CLASSES)
        congestion_level = min(1.0, vehicle_count / MAX_VEHICLE_COUNT)
        ambulance_detected = "ambulance" in class_counter
        avg_speed = 30  # Placeholder, replace with real calculation if available
        queue_length = vehicle_count // 2  # Placeholder
        priority = 4 if ambulance_detected else 1

        live_stats.update({
            "timestamp": datetime.now().isoformat(),
            "vehicleCount": vehicle_count,
            "ambulanceDetected": ambulance_detected,
            "congestionLevel": congestion_level,
            "avgSpeed": avg_speed,
            "queueLength": queue_length,
            "priority": priority
        })
        # --- End live_stats update ---

        ret, buffer = cv2.imencode('.jpg', annotated_frame)
        frame_bytes = buffer.tobytes()
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

@app.route('/video_feed')
def video_feed():
    return Response(gen_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/live_stats')
def get_live_stats():
    return jsonify(live_stats)

@app.route('/output/<path:filename>')
def download_output(filename):
    return send_from_directory(ANNOTATED_DIR, filename, as_attachment=True)

def parse_ambulance_detected(log_path):
    # Parse the log file to check if ambulance was detected in any frame
    try:
        with open(log_path, "r") as f:
            for line in f:
                if "| True |" in line:
                    return True
    except Exception:
        pass
    return False

@app.route('/api/analyze', methods=['POST'])
def analyze_videos():
    # Accept up to 4 videos: north, south, east, west
    directions = ['north', 'south', 'east', 'west']
    results = []
    for direction in directions:
        file = request.files.get(direction)
        if file:
            # Save uploaded file
            input_path = os.path.join(OUTPUT_DIR, f"{direction}_{int(time.time())}.mp4")
            file.save(input_path)
            # Use run_detection for file-based detection (not live)
            detection_result = run_detection(
                source=input_path,
                output_dir=OUTPUT_DIR,
                frame_save_dir=FRAME_SAVE_DIR,
                log_prefix=direction,
                is_live=False
            )
            # Prepare response for frontend
            avg_vehicle_count = detection_result.get("congestion_score", 0) * MAX_VEHICLE_COUNT // 100
            congestion_level = min(1.0, avg_vehicle_count / MAX_VEHICLE_COUNT)
            log_path = detection_result.get("log_path", "")
            ambulance_detected = parse_ambulance_detected(log_path)
            avg_speed = 30  # Placeholder
            queue_length = avg_vehicle_count // 2  # Placeholder
            wait_time = int(congestion_level * 90 + 15)
            priority = 4 if ambulance_detected else 1
            annotated_video_path = detection_result.get("video_path", "")
            results.append({
                "direction": direction,
                "vehicleCount": avg_vehicle_count,
                "ambulanceDetected": ambulance_detected,
                "congestionLevel": congestion_level,
                "avgSpeed": avg_speed,
                "queueLength": queue_length,
                "waitTime": wait_time,
                "priority": priority,
                "annotatedVideoUrl": f"/output/{os.path.basename(annotated_video_path)}" if annotated_video_path else ""
            })
    return jsonify({"results": results})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)
