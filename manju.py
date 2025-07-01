import cv2
import os
import time
import requests
from collections import Counter
from datetime import datetime
from ultralytics import YOLO

# ---------------- Configuration ----------------
MODEL_PATH = "run/detect/train/weights/best.pt"
OUTPUT_DIR = "output"
FRAME_SAVE_DIR = os.path.join(OUTPUT_DIR, "ambulance_frames")
API_URL = "http://your-api.com/alert"  # Your custom API (optional)
CONFIDENCE_THRESHOLD = 0.3
COOLDOWN_FRAMES = 100
MAX_VEHICLE_COUNT = 50
VEHICLE_CLASSES = ["car", "bus", "truck", "motorbike", "bicycle", "ambulance"]
CAMERA_INDEX = 0  # Change to 1/2 for external webcam

# Blynk Credentials
BLYNK_AUTH_TOKEN = "oKiOhQnjHarWAs_gKNPS9UbQ-9QeggkK"
BLYNK_URL = f"https://blynk.cloud/external/api/update?token={BLYNK_AUTH_TOKEN}&V1="
# ------------------------------------------------


def run_detection(
    source,
    output_dir=OUTPUT_DIR,
    frame_save_dir=FRAME_SAVE_DIR,
    log_prefix="live",
    blynk_url=BLYNK_URL,
    api_url=API_URL,
    confidence_threshold=CONFIDENCE_THRESHOLD,
    cooldown_frames=COOLDOWN_FRAMES,
    max_vehicle_count=MAX_VEHICLE_COUNT,
    vehicle_classes=VEHICLE_CLASSES,
    is_live=True
):
    """
    Runs detection on a video source (camera index or file path).
    Saves annotated video, logs, and triggers Blynk/API alerts.
    Returns final congestion score and log/video paths.
    """
    os.makedirs(output_dir, exist_ok=True)
    os.makedirs(frame_save_dir, exist_ok=True)

    # Load YOLO model
    model = YOLO(MODEL_PATH)
    print("✅ Model loaded.")

    # Open video source
    cap = cv2.VideoCapture(source)
    if not cap.isOpened():
        print("❌ Unable to open video source.")
        return None

    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 20.0

    timestamp = int(time.time())
    video_name = f"{log_prefix}_output_{timestamp}.mp4"
    video_path = os.path.join(output_dir, video_name)
    log_path = os.path.join(output_dir, f"{log_prefix}_log_{timestamp}.txt")

    out = cv2.VideoWriter(video_path, cv2.VideoWriter_fourcc(*'mp4v'), fps, (width, height))

    alert_sent = False
    cooldown_counter = 0
    frame_number = 0
    vehicle_counts = []

    with open(log_path, "w") as log_file:
        log_file.write(f"Detection Started: {datetime.now()}\n")
        log_file.write("Frame | Time | AmbulanceDetected | VehicleCount | Congestion | Classes\n")
        log_file.write("-" * 80 + "\n")

        print("🎥 Detection started. Press 'q' to stop (live only).\n")

        while True:
            ret, frame = cap.read()
            if not ret:
                print("⚠ Failed to grab frame.")
                break

            frame_number += 1
            time_now = datetime.now().strftime("%H:%M:%S")

            # YOLOv8 Prediction
            results = model.predict(source=frame, conf=confidence_threshold, save=False, imgsz=640)
            annotated_frame = results[0].plot()
            class_ids = results[0].boxes.cls.cpu().numpy().astype(int)
            class_names = [results[0].names[c] for c in class_ids]
            class_counter = Counter(class_names)

            vehicle_count = sum(class_counter.get(c, 0) for c in vehicle_classes)
            vehicle_counts.append(vehicle_count)

            # Congestion level
            if vehicle_count < 5:
                congestion = "Low"
            elif vehicle_count < 15:
                congestion = "Medium"
            else:
                congestion = "High"

            # Send Congestion Score to Blynk
            congestion_score = min(100, int((vehicle_count / max_vehicle_count) * 100))
            try:
                blynk_response = requests.get(blynk_url + str(congestion_score))
                print(f"📡 Sent congestion score {congestion_score} to Blynk (Status: {blynk_response.status_code})")
            except Exception as e:
                print("❌ Error sending to Blynk:", e)

            # Check for ambulance
            ambulance_detected = "ambulance" in class_counter

            if ambulance_detected and not alert_sent:
                try:
                    response = requests.post(api_url, json={"alert": "ambulance_detected"})
                    print(f"🚨 Ambulance Detected! API Response: {response.status_code}")
                except Exception as e:
                    print("❌ API Error:", e)

                # Save the frame
                frame_save_path = os.path.join(frame_save_dir, f"{log_prefix}_frame_{frame_number}.jpg")
                cv2.imwrite(frame_save_path, frame)

                alert_sent = True
                cooldown_counter = cooldown_frames

            if alert_sent:
                cooldown_counter -= 1
                if cooldown_counter <= 0:
                    alert_sent = False

            # Log this frame
            log_file.write(
                f"{frame_number} | {time_now} | {ambulance_detected} | {vehicle_count} | {congestion} | {dict(class_counter)}\n"
            )

            # Save and show
            out.write(annotated_frame)
            if is_live:
                cv2.imshow("🚑 Ambulance Detection (Live)", annotated_frame)
                if cv2.waitKey(1) & 0xFF == ord('q'):
                    break

        # Final Congestion Score Calculation
        cap.release()
        out.release()
        if is_live:
            cv2.destroyAllWindows()

    if vehicle_counts:
        avg_count = sum(vehicle_counts) / len(vehicle_counts)
        final_congestion_score = min(100, int((avg_count / max_vehicle_count) * 100))
    else:
        final_congestion_score = 0

    # Save final log
    with open(log_path, "a") as log_file:
        log_file.write("-" * 80 + "\n")
        log_file.write(f"\nFinal Congestion Score (0–100): {final_congestion_score}\n")

    print(f"\n✅ Detection completed.\n📼 Video saved: {video_path}\n📝 Log saved: {log_path}\n🚦 Final Congestion Score: {final_congestion_score}/100")
    return {
        "video_path": video_path,
        "log_path": log_path,
        "congestion_score": final_congestion_score
    }

# --- Main entry for live detection ---
if __name__ == "__main__":
    run_detection(CAMERA_INDEX, log_prefix="live", is_live=True)