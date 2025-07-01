from ultralytics import YOLO
import cv2
import requests
import os
from tkinter import Tk, filedialog
import time
from datetime import datetime
from collections import Counter

# ------------------- CONFIGURATION -------------------
MODEL_PATH = "runs/detect/train/weights/best.pt"
API_URL = "http://your-api.com/alert"  # replace with real one
OUTPUT_FOLDER = "output"
CONFIDENCE_THRESHOLD = 0.3
COOLDOWN_FRAMES = 100
VEHICLE_CLASSES = ["car", "bus", "truck", "motorbike", "bicycle", "ambulance"]
LOG_FILENAME = f"detection_log_{int(time.time())}.csv"
# ------------------------------------------------------

# Load model
model = YOLO(MODEL_PATH)
if model:
    print("✅ Model loaded successfully")
else:
    print("❌ Model not found!")

# Ask user to select a video
Tk().withdraw()
print("📂 Select a video file...")
video_path = filedialog.askopenfilename(
    title="Select a video",
    filetypes=[("Video files", "*.mp4 *.avi *.mov *.mkv")]
)

if not video_path:
    print("❌ No video selected.")
    exit()

# Extract file info
video_filename = os.path.basename(video_path)
video_name_only = os.path.splitext(video_filename)[0]
timestamp = int(time.time())

# Create output folder if not exists
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

# Define output video path
output_video_path = os.path.join(OUTPUT_FOLDER, f"{video_name_only}_output_{timestamp}.mp4")
output_log_path = os.path.join(OUTPUT_FOLDER, LOG_FILENAME)

# Load video
cap = cv2.VideoCapture(video_path)
width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
fps = cap.get(cv2.CAP_PROP_FPS)
total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

# Output writer
out = cv2.VideoWriter(output_video_path, cv2.VideoWriter_fourcc(*'mp4v'), fps, (width, height))

# Cooldown for API call
alert_sent = False
cooldown_counter = 0

# Open log file
with open(output_log_path, "w") as log_file:
    log_file.write("Frame,Timestamp,AmbulanceDetected,VehicleCount,CongestionLevel,DetectedClasses\n")

    print("🚦 Processing video...")

    frame_number = 0
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        frame_number += 1
        timestamp_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # Inference
        results = model.predict(source=frame, conf=CONFIDENCE_THRESHOLD, save=False, imgsz=640)
        annotated_frame = results[0].plot()
        class_ids = results[0].boxes.cls.cpu().numpy().astype(int)
        class_names = [results[0].names[c] for c in class_ids]

        # Count classes
        class_counter = Counter(class_names)

        # Count vehicles (including ambulance)
        vehicle_count = sum(class_counter[c] for c in VEHICLE_CLASSES if c in class_counter)

        # Determine congestion level
        if vehicle_count < 5:
            congestion = "Low"
        elif vehicle_count < 15:
            congestion = "Medium"
        else:
            congestion = "High"

        # Detect ambulance
        ambulance_detected = "ambulance" in class_counter

        if ambulance_detected and not alert_sent:
            print(f"🚨 Frame {frame_number}: Ambulance detected! Calling API...")
            try:
                response = requests.post(API_URL, json={"alert": "ambulance_detected"})
                print("✅ API called:", response.status_code)
            except Exception as e:
                print("❌ API error:", e)
            alert_sent = True
            cooldown_counter = COOLDOWN_FRAMES

        # Handle cooldown
        if alert_sent:
            cooldown_counter -= 1
            if cooldown_counter <= 0:
                alert_sent = False

        # Log this frame
        log_file.write(f"{frame_number},{timestamp_str},{ambulance_detected},{vehicle_count},{congestion},{dict(class_counter)}\n")

        # Save frame
        out.write(annotated_frame)

        # Show
        cv2.imshow("🚗 Ambulance & Congestion Detection", annotated_frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

# Cleanup
cap.release()
out.release()
cv2.destroyAllWindows()

print(f"\n✅ Output saved at: {output_video_path}")
print(f"📝 Log file saved at: {output_log_path}")
