from ultralytics import YOLO
import cv2
import requests
import os

# Load the trained model
model = YOLO("runs/detect/train/weights/best.pt")
if model:
    print("model fetched...")


else: print("model not found...!!!")

# Video source (file or webcam)
video_path = "vdo1.mp4"

if video_path:
    print("Video loaded...")


else:
    print("video not found...!!!")

cap = cv2.VideoCapture(video_path)

# Get video properties
width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
fps = cap.get(cv2.CAP_PROP_FPS)

# Output video
out = cv2.VideoWriter("output_with_api.mp4", cv2.VideoWriter_fourcc(*'mp4v'), fps, (width, height))

# API endpoint to call when ambulance is detected
API_URL = "http://your-api.com/alert"  # Replace with your API endpoint

# Set a cooldown to prevent spammy API calls
alert_sent = False
cooldown_frames = 100  # Number of frames to wait before next API call
cooldown_counter = 0

while cap.isOpened():
    ret, frame = cap.read()
    if not ret:
        break

    # YOLO inference
    results = model.predict(source=frame, conf=0.3, save=False, imgsz=640)
    annotated_frame = results[0].plot()

    # Check detections
    detected_classes = results[0].names
    boxes = results[0].boxes

    # Get class IDs of all detections in this frame
    class_ids = boxes.cls.cpu().numpy().astype(int)

    if 0 in class_ids and not alert_sent:  # class_id 0 = 'ambulance'
        print("🚨 Ambulance detected! Calling API...")
        try:
            response = requests.post(API_URL, json={"alert": "ambulance_detected"})
            print("✅ API called. Response:", response.status_code)

            if response.status_code == 404:
                print("API Call failed...!!! (404)")

        except Exception as e:
            print("❌ Error calling API:", e)
        alert_sent = True
        cooldown_counter = cooldown_frames

    # Handle cooldown
    if alert_sent:
        cooldown_counter -= 1
        if cooldown_counter <= 0:
            alert_sent = False

    # Write to output video
    out.write(annotated_frame)

    # Display output
    cv2.imshow("Ambulance Detection with API", annotated_frame)
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

# Cleanup
cap.release()
out.release()
cv2.destroyAllWindows()
