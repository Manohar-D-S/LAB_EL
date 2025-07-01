import cv2
import os
import time
import requests
import multiprocessing
from tkinter import Tk, filedialog
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
MAX_VEHICLE_COUNT = 50  # used to normalize congestion score
VEHICLE_CLASSES = ["car", "bus", "truck", "motorbike", "bicycle", "ambulance"]
# ------------------------------------------------

os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(FRAME_SAVE_DIR, exist_ok=True)


def process_video(video_path):
    try:
        model = YOLO(MODEL_PATH)
        video_filename = os.path.basename(video_path)
        name_only = os.path.splitext(video_filename)[0]
        timestamp = int(time.time())

        output_video_path = os.path.join(OUTPUT_DIR, f"{name_only}_output_{timestamp}.mp4")
        log_path = os.path.join(OUTPUT_DIR, f"{name_only}_log.txt")

        cap = cv2.VideoCapture(video_path)
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fps = cap.get(cv2.CAP_PROP_FPS)

        out = cv2.VideoWriter(output_video_path, cv2.VideoWriter_fourcc(*'mp4v'), fps, (width, height))

        alert_sent = False
        cooldown_counter = 0
        frame_number = 0
        vehicle_counts = []

        with open(log_path, "w") as log_file:
            log_file.write(f"Log for {video_filename} - {datetime.now()}\n")
            log_file.write("Frame | Time | AmbulanceDetected | VehicleCount | Congestion | Classes\n")
            log_file.write("-" * 80 + "\n")

            while cap.isOpened():
                ret, frame = cap.read()
                if not ret:
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

                # Congestion level as label
                if vehicle_count < 5:
                    congestion = "Low"
                elif vehicle_count < 15:
                    congestion = "Medium"
                else:
                    congestion = "High"

                # Check for ambulance
                ambulance_detected = "ambulance" in class_counter

                if ambulance_detected and not alert_sent:
                    try:
                        response = requests.post(API_URL, json={"alert": "ambulance_detected"})
                        print(f"[{name_only}] 🚨 Ambulance detected at frame {frame_number}. API status: {response.status_code}")
                    except Exception as e:
                        print(f"[{name_only}] ❌ API error:", e)

                    # Save the frame
                    frame_path = os.path.join(FRAME_SAVE_DIR, f"{name_only}_frame_{frame_number}.jpg")
                    cv2.imwrite(frame_path, frame)

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

        cap.release()
        out.release()

        # Calculate congestion score (0–100)
        if vehicle_counts:
            avg_count = sum(vehicle_counts) / len(vehicle_counts)
            congestion_score = min(100, int((avg_count / MAX_VEHICLE_COUNT) * 100))
        else:
            congestion_score = 0

        # Final log and print
        with open(log_path, "a") as log_file:
            log_file.write("-" * 80 + "\n")
            log_file.write(f"\nFinal Congestion Score (0–100): {congestion_score}\n")

        print(f"✅ [{name_only}] Done.\n   Output video: {output_video_path}\n   Log file: {log_path}\n   🚦 Congestion Score: {congestion_score}/100")

    except Exception as e:
        print(f"❌ Error processing {video_path}: {e}")


def select_and_process_videos():
    print("📂 Please select one or more video files...")
    Tk().withdraw()
    video_paths = filedialog.askopenfilenames(
        title="Select Video Files",
        filetypes=[("Video files", "*.mp4 *.avi *.mov *.mkv")]
    )

    if not video_paths:
        print("❌ No files selected.")
        return

    print(f"🧠 Starting multiprocessing for {len(video_paths)} videos...")

    with multiprocessing.Pool(processes=min(4, len(video_paths))) as pool:
        pool.map(process_video, video_paths)


if __name__ == "__main__":
    select_and_process_videos()
