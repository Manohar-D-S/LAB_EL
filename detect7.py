import cv2
import os
import time
import requests
from collections import Counter
from datetime import datetime
from ultralytics import YOLO

# ---------------- Configuration ----------------
MODEL_PATH = "runs/detect/train/weights/best.pt"
OUTPUT_DIR = "output"
FRAME_SAVE_DIR = os.path.join(OUTPUT_DIR, "ambulance_frames")
API_URL = "http://your-api.com/alert"
CONFIDENCE_THRESHOLD = 0.3
COOLDOWN_FRAMES = 100
MAX_VEHICLE_COUNT = 50
VEHICLE_CLASSES = ["car", "bus", "truck", "motorbike", "bicycle", "ambulance"]
CAMERA_INDEX = 0  # Change to 1 or 2 if external camera
# ------------------------------------------------

os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(FRAME_SAVE_DIR, exist_ok=True)

# Load YOLO model
model = YOLO(MODEL_PATH)
print("✅ Model loaded.")

# Video Writer Setup
cap = cv2.VideoCapture(CAMERA_INDEX)
if not cap.isOpened():
    print("❌ Unable to open camera.")
    exit()

width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
fps = cap.get(cv2.CAP_PROP_FPS) or 20.0

timestamp = int(time.time())
video_name = f"live_output_{timestamp}.mp4"
video_path = os.path.join(OUTPUT_DIR, video_name)
log_path = os.path.join(OUTPUT_DIR, f"live_log_{timestamp}.txt")

out = cv2.VideoWriter(video_path, cv2.VideoWriter_fourcc(*'mp4v'), fps, (width, height))

# Variables
alert_sent = False
cooldown_counter = 0
frame_number = 0
vehicle_counts = []

with open(log_path, "w") as log_file:
    log_file.write(f"Live Detection Started: {datetime.now()}\n")
    log_file.write("Frame | Time | AmbulanceDetected | VehicleCount | Congestion | Classes\n")
    log_file.write("-" * 80 + "\n")

    print("🎥 Live detection started. Press 'q' to stop.\n")

    while True:
        ret, frame = cap.read()
        if not ret:
            print("⚠️ Failed to grab frame.")
            break

        frame_number += 1
        time_now = datetime.now().strftime("%H:%M:%S")

        results = model.predict(source=frame, conf=CONFIDENCE_THRESHOLD, save=False, imgsz=640)
        annotated_frame = results[0].plot()
        class_ids = results[0].boxes.cls.cpu().numpy().astype(int)
        class_names = [results[0].names[c] for c in class_ids]
        class_counter = Counter(class_names)

        vehicle_count = sum(class_counter.get(c, 0) for c in VEHICLE_CLASSES)
        vehicle_counts.append(vehicle_count)

        # Congestion Label
        if vehicle_count < 5:
            congestion = "Low"
        elif vehicle_count < 15:
            congestion = "Medium"
        else:
            congestion = "High"

        ambulance_detected = "ambulance" in class_counter

        if ambulance_detected and not alert_sent:
            try:
                response = requests.post(API_URL, json={"alert": "ambulance_detected"})
                print(f"🚨 Ambulance Detected! API Response: {response.status_code}")
            except Exception as e:
                print("❌ API Error:", e)

            frame_save_path = os.path.join(FRAME_SAVE_DIR, f"live_frame_{frame_number}.jpg")
            cv2.imwrite(frame_save_path, frame)

            alert_sent = True
            cooldown_counter = COOLDOWN_FRAMES

        if alert_sent:
            cooldown_counter -= 1
            if cooldown_counter <= 0:
                alert_sent = False

        # Log this frame
        log_file.write(
            f"{frame_number} | {time_now} | {ambulance_detected} | {vehicle_count} | {congestion} | {dict(class_counter)}\n"
        )

        out.write(annotated_frame)
        cv2.imshow("🚑 Ambulance Detection (Live)", annotated_frame)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

# Final Congestion Score
cap.release()
out.release()
cv2.destroyAllWindows()

if vehicle_counts:
    avg_count = sum(vehicle_counts) / len(vehicle_counts)
    congestion_score = min(100, int((avg_count / MAX_VEHICLE_COUNT) * 100))
else:
    congestion_score = 0

with open(log_path, "a") as log_file:
    log_file.write("-" * 80 + "\n")
    log_file.write(f"\nFinal Congestion Score (0–100): {congestion_score}\n")

print(f"\n✅ Live detection completed.\n📼 Video saved: {video_path}\n📝 Log saved: {log_path}\n🚦 Final Congestion Score: {congestion_score}/100")
