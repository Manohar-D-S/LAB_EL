from flask import Flask, Response, request, jsonify, send_from_directory
import cv2
import os
import threading
import time
from ultralytics import YOLO
from collections import Counter
from datetime import datetime

app = Flask(__name__)
model = YOLO("run/detect/train/weights/best.pt")

OUTPUT_DIR = "output"
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
VEHICLE_CLASSES = ["car", "bus", "truck", "motorbike", "bicycle", "ambulance"]
MAX_VEHICLE_COUNT = 50

def gen_frames():
    cap = cv2.VideoCapture(0)
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
            # Annotated output path
            annotated_path = os.path.join(ANNOTATED_DIR, f"annotated_{direction}_{int(time.time())}.mp4")
            # Run YOLOv8 detection and save annotated video
            cap = cv2.VideoCapture(input_path)
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            fps = cap.get(cv2.CAP_PROP_FPS) or 20.0
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            out = cv2.VideoWriter(annotated_path, fourcc, fps, (width, height))
            vehicle_count = 0
            ambulance_detected = False
            frame_count = 0
            for _ in range(int(cap.get(cv2.CAP_PROP_FRAME_COUNT))):
                ret, frame = cap.read()
                if not ret:
                    break
                frame_count += 1
                yolo_results = model.predict(source=frame, conf=0.3, save=False, imgsz=640)
                annotated_frame = yolo_results[0].plot()
                out.write(annotated_frame)
                class_ids = yolo_results[0].boxes.cls.cpu().numpy().astype(int)
                class_names = [yolo_results[0].names[c] for c in class_ids]
                class_counter = Counter(class_names)
                vehicle_count += sum(class_counter.get(c, 0) for c in VEHICLE_CLASSES)
                if "ambulance" in class_counter:
                    ambulance_detected = True
            cap.release()
            out.release()
            avg_vehicle_count = vehicle_count // frame_count if frame_count else 0
            congestion_level = min(1.0, avg_vehicle_count / MAX_VEHICLE_COUNT)
            avg_speed = 30  # Placeholder
            queue_length = avg_vehicle_count // 2  # Placeholder
            wait_time = int(congestion_level * 90 + 15)
            priority = 4 if ambulance_detected else 1
            results.append({
                "direction": direction,
                "vehicleCount": avg_vehicle_count,
                "ambulanceDetected": ambulance_detected,
                "congestionLevel": congestion_level,
                "avgSpeed": avg_speed,
                "queueLength": queue_length,
                "waitTime": wait_time,
                "priority": priority,
                "annotatedVideoUrl": f"/output/{os.path.basename(annotated_path)}"
            })
    return jsonify({"results": results})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)
