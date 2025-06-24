"""
Configuration settings for the ambulance traffic light control system
"""

# Proximity thresholds
PROXIMITY_NOTIFICATION_THRESHOLD = 150  # meters
PROXIMITY_CONTROL_THRESHOLD = 500  # meters

# Traffic light settings
DEFAULT_GREEN_DURATION = 30  # seconds

# ESP32 configuration
ESP32_IP_MAP = {
    "Unnamed": "192.168.1.100",  # Add your ESP32 IPs here
    # Format: "signal_id": "ip_address"
}

# Server settings
HOST = "0.0.0.0"
PORT = 8001  # Changed from 8000 to avoid conflicts
