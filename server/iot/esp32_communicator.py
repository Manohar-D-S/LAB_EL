import requests


class ESP32Communicator:
    def __init__(self, esp32_ip_map=None):
        # Always use the single ESP32 IP
        self.esp32_ip = "192.168.43.100"

    def notify_signal(self, data: dict):
        # Always send to the single ESP32 IP
        try:
            resp = requests.post(f"http://{self.esp32_ip}/proximity", json=data, timeout=2)
            print(f"Sent proximity data to ESP32 ({self.esp32_ip}): {resp.status_code}")
        except Exception as e:
            print(f"Failed to notify ESP32 ({self.esp32_ip}): {e}")

    def send_command(self, signal_id, command, duration=None, direction=None):
        # Ignore signal_id for IP lookup, always use the single ESP32 IP
        payload = {
            "command": command,
            "signal_id": signal_id,
        }
        if duration is not None:
            payload["duration"] = duration
        if direction is not None:
            payload["direction"] = direction
            print(f"Turning ON signal {signal_id} direction: {direction}")
        else:
            print(f"Turning ON signal {signal_id} (no direction info)")
        try:
            resp = requests.post(f"http://{self.esp32_ip}/traffic-light-control", json=payload, timeout=2)
            print(f"Sent command '{command}' to ESP32 ({self.esp32_ip}): {resp.status_code}")
            return resp.status_code == 200
        except Exception as e:
            print(f"Failed to send command to ESP32 ({self.esp32_ip}): {e}")
            return False
