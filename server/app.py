from fastapi import FastAPI
from iot.routes import router as iot_router
from iot.signal_processor import SignalProcessor
from iot.esp32_communicator import ESP32Communicator
from iot.iot_manager import IOTManager

app = FastAPI()

# Create a dummy graph for now (replace with real graph data)
graph = {}

# ESP32 IP mapping (signal_id -> IP address)
esp32_ip_map = {
    "Unnamed": "192.168.1.100",  # Example mapping
    # Add more mappings as needed
}

# Initialize components
@app.on_event("startup")
async def startup_event():
    # Initialize the ESP32 communicator
    esp32_communicator = ESP32Communicator(esp32_ip_map)
    
    # Initialize the signal processor
    signal_processor = SignalProcessor(graph)
    signal_processor.set_esp32_communicator(esp32_communicator)
    
    # Initialize the IOT manager
    app.state.iot_manager = IOTManager(signal_processor, esp32_communicator)

# Include the IOT router
app.include_router(iot_router)

# Root endpoint
@app.get("/")
async def root():
    return {"status": "running"}
