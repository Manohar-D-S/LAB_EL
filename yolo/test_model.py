from ultralytics import YOLO
import cv2
import os

# Load model
model = YOLO("runs/detect/train/weights/best.pt")

# Path to input image
image_path = "test1.jpeg"
results = model.predict(source=image_path, save=True, conf=0.3)

# Find the real saved image path
saved_image_path = results[0].save_dir + "/" + os.path.basename(results[0].path)

# Display the image
img = cv2.imread(saved_image_path)

if img is None:
    print(f"Error: Image not found at {saved_image_path}")
else:
    cv2.imshow("Ambulance Detection Result", img)
    cv2.waitKey(0)
    cv2.destroyAllWindows()
