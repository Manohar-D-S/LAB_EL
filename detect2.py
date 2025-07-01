from ultralytics import YOLO
import cv2
import requests
import os
from tkinter import Tk, filedialog
import time

# Load the trained model
model = YOLO("runs/detect/train/weights/best.pt")
if model:
    print("✅ Model loaded successfully")
else:
    print("❌ Model not found!")

# File picker for video input
print("📂 Please select the input video file...")

Tk().withdraw()  # Hide the main tkinter window
video_path = filedialog.askopenfilename(
    title="Select a video file",
    filetypes=[("Video files", "*.mp4 *.avi *.mov *.mkv")]
)

if not video_path:
    print("❌ No video selected. Exiting...")
    exit()

print(f"🎬 Video selected: {video_path}")

# Extract filename without extension
video_filename = os.path.basename(video_path)
video_name_only = os.path.splitext(video_filename)[0]

# Create output filename
timestamp = int(time.time())
output_filename = f"{video_name_only}_output_{timestamp}.mp4"

# Load video
cap = cv2.VideoCapture(video_path)

# Get video properties
width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
fps = cap.get(cv2.CAP_PROP_FPS)

# Setup output writer
out = cv2.VideoWriter(output_filename, cv2.VideoWriter_fourcc(*'mp4v'), fps, (width, height))

# API endpoint
API_URL = "http://your-api.com/alert"  # Replace with your real API

# Cooldown for API call
alert_sent = False
cooldown_frames = 100
cooldown_counter = 0

while cap.isOpened():
    ret, frame = cap.read()
    if not ret:
        break

    # Inference
    results = model.predict(source=frame, conf=0.3, save=False, imgsz=640)
    annotated_frame = results[0].plot()

    # Check detections
    class_ids = results[0].boxes.cls.cpu().numpy().astype(int)

    if 0 in class_ids and not alert_sent:  # 0 = ambulance
        print("🚨 Ambulance detected! Calling API...")
        try:
            response = requests.post(API_URL, json={"alert": "ambulance_detected"})
            if response.status_code == 200:
                print("✅ API call successful")
            else:
                print(f"⚠️ API call failed with status: {response.status_code}")
        except Exception as e:
            print("❌ API call error:", e)

        alert_sent = True
        cooldown_counter = cooldown_frames

    if alert_sent:
        cooldown_counter -= 1
        if cooldown_counter <= 0:
            alert_sent = False

    # Save frame
    out.write(annotated_frame)

    # Optional display
    cv2.imshow("Ambulance Detection", annotated_frame)
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

# Clean up
cap.release()
out.release()
cv2.destroyAllWindows()

print(f"\n✅ Done! Output saved as: {output_filename}")
