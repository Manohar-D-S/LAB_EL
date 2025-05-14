# API and external service configurations
import os

class Config:
    # MQTT Broker (for IoT signals)
    MQTT_BROKER = "broker.hivemq.com"
    MQTT_PORT = 1883
    MQTT_TOPIC_PREFIX = "bengaluru_traffic/"
    
    # OSM Data
    OSM_LOCATION = "Bengaluru, India"
    OSM_CRS = "EPSG:4326"  # WGS84 latitude/