class ESP32Communicator:
    def __init__(self, esp32_ip_map):
        self.esp32_ip_map = esp32_ip_map

    def notify_signal(self, data: dict):
        signal_id = data.get("signalId")
        ip = self.esp32_ip_map.get(signal_id)
        if not ip:
            print(f"No ESP32 IP found for signalId: {signal_id}")
            return
        # Send the full JSON data to the ESP32
        import requests
        try:
            resp = requests.post(f"http://{ip}/proximity", json=data, timeout=2)
            print(f"Sent proximity data to ESP32 ({ip}): {resp.status_code}")
        except Exception as e:
            print(f"Failed to notify ESP32 ({ip}): {e}")
