# 🚑 Ambulance Detection Dashboard

Advanced YOLOv8-based ambulance detection system for traffic management and emergency response.

## 📁 Project Structure

```
DASHBOARD/
├── models/                 🧠 Trained models
│   ├── ambulance_model.pt     # Your trained ambulance detection model
│   └── yolov8n.pt             # Base YOLOv8 model (fallback)
├── detection/              🔍 Detection logic  
│   ├── ambulance_detector.py  # Core detection class
│   └── utils.py               # Helper functions
├── backend/                🌐 API server
│   └── main.py                # FastAPI server for dashboard integration
├── config/                 ⚙️  Configuration
│   └── data.yaml              # Model and system configuration
├── uploads/                📤 Upload folder (auto-created)
├── output/                 📥 Results folder (auto-created)
├── requirements.txt        📋 Python dependencies
├── start_dashboard.py      🚀 Quick start script
└── README.md              📖 This documentation
```

## 🚀 Quick Start

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Test the Detector
```bash
python detection/ambulance_detector.py
```

### 3. Start the API Server
```bash
cd backend
python main.py
```

### 4. Access the Dashboard
- **API**: http://localhost:8000
- **Interactive Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/api/health

## 🔧 Features

### ✅ Core Detection
- **Real-time ambulance detection** using trained YOLOv8 model
- **High accuracy** (89% success rate on test videos)
- **CUDA acceleration** when available
- **Configurable thresholds** for confidence and NMS

### ✅ API Endpoints
- **Image Detection**: `/api/detect/image`
- **Video Analysis**: `/api/detect/video`  
- **Intersection Analysis**: `/api/analyze/intersection`
- **Emergency Signal Control**: `/api/signal-control`
- **System Stats**: `/api/detector/stats`

### ✅ Dashboard Integration
- **Multi-camera support** (North, South, East, West)
- **Emergency signal override** when ambulances detected
- **Real-time processing** with performance metrics
- **File upload and analysis** capabilities

## 📊 Model Performance

Your trained model achieves:
- **89% detection rate** on test videos (8/9 videos)
- **71% frame detection rate** in positive videos
- **10.4 FPS** processing speed (real-time capable)
- **Single class**: Ambulance detection

## 🛠️ Configuration

Edit `config/data.yaml` to customize:
```yaml
# Detection settings
confidence_threshold: 0.25
nms_threshold: 0.45

# Emergency signal settings
emergency_detection_threshold: 1
priority_signal_duration: 60
normal_signal_duration: 45
```

## 🧪 Testing

### Quick Test
```bash
python start_dashboard.py
```

### Manual Testing
```python
from detection.ambulance_detector import AmbulanceDetector

# Initialize detector
detector = AmbulanceDetector()

# Test on image
result = detector.detect_frame(image)
print(f"Ambulances found: {result['ambulance_count']}")

# Test on video  
video_result = detector.detect_video("test_video.mp4")
print(f"Total ambulances: {video_result['total_ambulances']}")
```

## 🌐 API Usage

### Image Detection
```bash
curl -X POST "http://localhost:8000/api/detect/image" \
     -H "Content-Type: multipart/form-data" \
     -F "file=@ambulance_image.jpg"
```

### Video Analysis
```bash
curl -X POST "http://localhost:8000/api/detect/video" \
     -H "Content-Type: multipart/form-data" \
     -F "file=@ambulance_video.mp4"
```

### Intersection Analysis (4-way)
```bash
curl -X POST "http://localhost:8000/api/analyze/intersection" \
     -F "video_north=@north_camera.mp4" \
     -F "video_south=@south_camera.mp4" \
     -F "video_east=@east_camera.mp4" \
     -F "video_west=@west_camera.mp4" \
     -F "intersection_id=intersection_01"
```

## 🚦 Emergency Signal Logic

When ambulances are detected:
1. **Emergency Mode** activates automatically
2. **Priority direction** gets extended green light (60s)
3. **Cross traffic** gets minimal time (15s)
4. **Normal operation** resumes after ambulance passes

## ⚡ Performance Optimization

### CUDA Setup
Ensure CUDA is properly configured:
```python
import torch
print(f"CUDA Available: {torch.cuda.is_available()}")
print(f"Device: {torch.cuda.get_device_name()}")
```

### Model Settings
Adjust detection thresholds via API:
```bash
curl -X POST "http://localhost:8000/api/detector/settings" \
     -H "Content-Type: application/json" \
     -d '{"confidence": 0.3, "nms": 0.5}'
```

## 🔍 Troubleshooting

### Common Issues

**Model not found**:
- Ensure `ambulance_model.pt` is in the `models/` folder
- Check file permissions and size (should be > 1MB)

**CUDA errors**:
- Install proper PyTorch version: `pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118`
- Verify CUDA compatibility with your GPU

**API connection errors**:
- Check if port 8000 is available
- Ensure FastAPI dependencies are installed
- Try different port: `uvicorn main:app --port 8001`

### Performance Issues
- **Reduce image resolution** for faster processing
- **Adjust confidence threshold** to reduce false positives
- **Use CPU mode** if CUDA is causing issues

## 🎯 Integration with React Dashboard

To integrate with your existing React dashboard:

1. **Update API endpoints** in your React components
2. **Use provided API routes** for ambulance detection
3. **Handle emergency signal responses** in your traffic logic
4. **Display detection results** in your dashboard UI

Example React integration:
```javascript
// Detect ambulances in uploaded videos
const analyzeIntersection = async (videos) => {
  const formData = new FormData();
  formData.append('video_north', videos.north);
  formData.append('video_south', videos.south);
  formData.append('video_east', videos.east);
  formData.append('video_west', videos.west);
  formData.append('intersection_id', 'main_intersection');

  const response = await fetch('/api/analyze/intersection', {
    method: 'POST',
    body: formData
  });
  
  const result = await response.json();
  
  if (result.emergency_override) {
    // Handle emergency signal override
    setEmergencyMode(true);
    setPriorityDirection(result.priority_direction);
  }
};
```

## 📈 Future Enhancements

- **Multiple ambulance tracking** across frames
- **Speed estimation** and trajectory prediction  
- **Integration with traffic management systems**
- **Real-time camera feed processing**
- **Mobile app notifications**
- **Advanced analytics dashboard**

## 🔗 Dependencies

Core packages:
- `ultralytics` - YOLOv8 framework
- `torch` - Deep learning backend  
- `opencv-python` - Computer vision
- `fastapi` - Web API framework
- `uvicorn` - ASGI server

See `requirements.txt` for complete list.

## 📄 License

This project is configured for ambulance detection in traffic management systems. Ensure compliance with local regulations for emergency vehicle detection and traffic signal control.

---

**🚑 Ready for Emergency Response!**

Your ambulance detection system is ready to enhance traffic safety and emergency response times.
