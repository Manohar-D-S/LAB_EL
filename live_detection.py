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
API_URL = "http://your-api.com/alert"  # Optional: your own API
CONFIDENCE_THRESHOLD = 0.3
COOLDOWN_FRAMES = 100
MAX_VEHICLE_COUNT = 50
VEHICLE_CLASSES = ["car", "bus", "truck", "motorbike", "bicycle", "ambulance"]
CAMERA_INDEX = 0  # Change to 1 or 2 if external webcam

# ✅ Working Blynk credentials
BLYNK_AUTH_TOKEN = "oKiOhQnjHarWAs_gKNPS9UbQ-9QeggkK"
BLYNK_VIRTUAL_PIN = "V0"  # ✅ We now use V0 (confirmed working)
BLYNK_URL = f"https://blynk.cloud/external/api/update?token={BLYNK_AUTH_TOKEN}&{BLYNK_VIRTUAL_PIN}="
# ------------------------------------------------

# Create output folders
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(FRAME_SAVE_DIR, exist_ok=True)

# Load YOLOv8 model
model = YOLO(MODEL_PATH)
print("✅ YOLO model loaded.")

# Initialize webcam
cap = cv2.VideoCapture(CAMERA_INDEX)
if not cap.isOpened():
    print("❌ Unable to open webcam.")
    exit()

# Get video properties
width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
fps = cap.get(cv2.CAP_PROP_FPS) or 20.0

# Output file setup
timestamp = int(time.time())
video_name = f"live_output_{timestamp}.mp4"
video_path = os.path.join(OUTPUT_DIR, video_name)
log_path = os.path.join(OUTPUT_DIR, f"live_log_{timestamp}.txt")

out = cv2.VideoWriter(video_path, cv2.VideoWriter_fourcc(*'mp4v'), fps, (width, height))

# Runtime variables
alert_sent = False
cooldown_counter = 0
frame_number = 0
vehicle_counts = []

# Logging
with open(log_path, "w") as log_file:
    log_file.write(f"Live Detection Log: {datetime.now()}\n")
    log_file.write("Frame | Time | AmbulanceDetected | VehicleCount | Congestion | Classes\n")
    log_file.write("-" * 80 + "\n")

    print("🎥 Live detection started. Press 'q' to quit.\n")

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

        # Congestion level
        if vehicle_count < 5:
            congestion = "Low"
        elif vehicle_count < 15:
            congestion = "Medium"
        else:
            congestion = "High"

        # ✅ Send congestion score to Blynk on V0
        congestion_score = min(100, int((vehicle_count / MAX_VEHICLE_COUNT) * 100))
        try:
            requests.get(BLYNK_URL + str(congestion_score))
            print(f"📡 Sent to Blynk (V0): {congestion_score}/100")
        except Exception as e:
            print("❌ Blynk update error:", e)

        # Check for ambulance
        ambulance_detected = "ambulance" in class_counter

        if ambulance_detected and not alert_sent:
            try:
                requests.post(API_URL, json={"alert": "ambulance_detected"})
                print(f"🚨 Ambulance Detected! Alert sent.")
            except Exception as e:
                print("❌ API Error:", e)

            frame_path = os.path.join(FRAME_SAVE_DIR, f"live_frame_{frame_number}.jpg")
            cv2.imwrite(frame_path, frame)
            alert_sent = True
            cooldown_counter = COOLDOWN_FRAMES

        if alert_sent:
            cooldown_counter -= 1
            if cooldown_counter <= 0:
                alert_sent = False

        # Log
        log_file.write(
            f"{frame_number} | {time_now} | {ambulance_detected} | {vehicle_count} | {congestion} | {dict(class_counter)}\n"
        )

        # Save video and display
        out.write(annotated_frame)
        cv2.imshow("🚑 Live Ambulance Detection", annotated_frame)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

# Finish
cap.release()
out.release()
cv2.destroyAllWindows()

if vehicle_counts:
    avg_count = sum(vehicle_counts) / len(vehicle_counts)
    final_score = min(100, int((avg_count / MAX_VEHICLE_COUNT) * 100))
else:
    final_score = 0

with open(log_path, "a") as log_file:
    log_file.write("-" * 80 + "\n")
    log_file.write(f"\nFinal Congestion Score (0–100): {final_score}\n")

print(f"\n✅ Done.\n📼 Video saved: {video_path}\n📝 Log file: {log_path}\n🚦 Final Score: {final_score}/100")
