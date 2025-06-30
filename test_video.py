from ultralytics import YOLO
import cv2
import os

# Load trained model
model = YOLO("runs/detect/train/weights/best.pt")  # Adjust path if needed

# Path to input video
video_path = "vdo.mp4"  # Replace with your video file
cap = cv2.VideoCapture(video_path)

# Get video properties
width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
fps = cap.get(cv2.CAP_PROP_FPS)

# Output video writer
output_path = "output_video.mp4"
fourcc = cv2.VideoWriter_fourcc(*'mp4v')
out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

# Frame-by-frame inference
while cap.isOpened():
    ret, frame = cap.read()
    if not ret:
        break

    # Inference on the frame (without saving to disk)
    results = model.predict(source=frame, conf=0.3, save=False, imgsz=640)

    # Draw results on the frame
    annotated_frame = results[0].plot()

    # Write frame to output video
    out.write(annotated_frame)

    # (Optional) Show live result
    cv2.imshow("YOLOv8 - Ambulance Detection", annotated_frame)
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

# Release resources
cap.release()
out.release()
cv2.destroyAllWindows()

print(f"\n✅ Detection completed. Output saved to: {output_path}")
