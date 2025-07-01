from ultralytics import YOLO
import cv2
import requests
import os
from tkinter import Tk, filedialog
import time
from datetime import datetime
from collections import Counter
import matplotlib.pyplot as plt
import glob

# ------------------- CONFIG -------------------
MODEL_PATH = "runs/detect/train/weights/best.pt"
API_URL = "http://your-api.com/alert"
OUTPUT_FOLDER = "output"
FRAME_SAVE_FOLDER = os.path.join(OUTPUT_FOLDER, "ambulance_frames")
VEHICLE_CLASSES = ["car", "bus", "truck", "motorbike", "bicycle", "ambulance"]
CONFIDENCE_THRESHOLD = 0.3
COOLDOWN_FRAMES = 100
# ----------------------------------------------

# Ensure output folders exist
os.makedirs(OUTPUT_FOLDER, exist_ok=True)
os.makedirs(FRAME_SAVE_FOLDER, exist_ok=True)

# Load YOLOv8 model
model = YOLO(MODEL_PATH)

# File dialog to select folder with videos
Tk().withdraw()
video_folder = filedialog.askdirectory(title="Select folder with videos")

video_files = glob.glob(f"{video_folder}/*.mp4") + \
              glob.glob(f"{video_folder}/*.avi") + \
              glob.glob(f"{video_folder}/*.mkv") + \
              glob.glob(f"{video_folder}/*.mov")

if not video_files:
    print("❌ No video files found.")
    exit()

# --- Setup real-time graph ---
plt.ion()
fig, ax = plt.subplots()
x_vals, y_vals = [], []
line, = ax.plot([], [], label="Vehicle Count")
ax.set_ylim(0, 50)
ax.set_xlabel("Frame")
ax.set_ylabel("Vehicle Count")
ax.set_title("Live Congestion Level")
ax.legend()

# --- Process each video ---
for video_path in video_files:
    print(f"\n🎞️ Processing: {video_path}")
    video_filename = os.path.basename(video_path)
    video_name_only = os.path.splitext(video_filename)[0]
    timestamp = int(time.time())

    cap = cv2.VideoCapture(video_path)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS)

    output_path = os.path.join(OUTPUT_FOLDER, f"{video_name_only}_output_{timestamp}.mp4")
    out = cv2.VideoWriter(output_path, cv2.VideoWriter_fourcc(*'mp4v'), fps, (width, height))

    log_path = os.path.join(OUTPUT_FOLDER, f"{video_name_only}_log_{timestamp}.csv")
    log_file = open(log_path, "w")
    log_file.write("Frame,Timestamp,AmbulanceDetected,VehicleCount,CongestionLevel,DetectedClasses\n")

    # Cooldown timer
    alert_sent = False
    cooldown_counter = 0

    frame_number = 0
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        frame_number += 1
        timestamp_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        results = model.predict(source=frame, conf=CONFIDENCE_THRESHOLD, save=False, imgsz=640)
        annotated_frame = results[0].plot()
        class_ids = results[0].boxes.cls.cpu().numpy().astype(int)
        class_names = [results[0].names[c] for c in class_ids]
        class_counter = Counter(class_names)

        vehicle_count = sum(class_counter.get(c, 0) for c in VEHICLE_CLASSES)

        # Congestion logic
        if vehicle_count < 5:
            congestion = "Low"
        elif vehicle_count < 15:
            congestion = "Medium"
        else:
            congestion = "High"

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

            # Save this frame
            ambulance_frame_path = os.path.join(FRAME_SAVE_FOLDER, f"{video_name_only}_frame_{frame_number}.jpg")
            cv2.imwrite(ambulance_frame_path, frame)

        if alert_sent:
            cooldown_counter -= 1
            if cooldown_counter <= 0:
                alert_sent = False

        # Log this frame
        log_file.write(f"{frame_number},{timestamp_str},{ambulance_detected},{vehicle_count},{congestion},{dict(class_counter)}\n")

        # Update graph
        x_vals.append(frame_number)
        y_vals.append(vehicle_count)
        line.set_data(x_vals[-100:], y_vals[-100:])
        ax.set_xlim(max(0, frame_number - 100), frame_number + 10)
        ax.set_ylim(0, max(20, max(y_vals[-100:], default=1) + 5))
        fig.canvas.draw()
        fig.canvas.flush_events()

        # Write and show
        out.write(annotated_frame)
        cv2.imshow("YOLOv8 Traffic Monitor", annotated_frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    out.release()
    log_file.close()
    print(f"✅ Output video saved: {output_path}")
    print(f"📄 Log saved: {log_path}")

cv2.destroyAllWindows()
plt.ioff()
plt.show()
