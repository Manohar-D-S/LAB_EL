import requests
import datetime


def log_esp_api(message: str):
    with open("esp_api.log", "a") as f:
        f.write(f"{datetime.datetime.now().isoformat()} - {message}\n")


class ESP32Communicator:
    def __init__(self, esp32_ip_map=None):
        # Always use the single ESP32 IP
        self.esp32_ip = "192.168.43.100"

    def notify_signal(self, data: dict):
        # Always send to the single ESP32 IP
        try:
            resp = requests.post(f"http://{self.esp32_ip}/proximity", json=data, timeout=2)
            msg = f"Sent proximity data to ESP32 ({self.esp32_ip}): {resp.status_code}"
            print(msg)
            log_esp_api(msg)
        except Exception as e:
            msg = f"Failed to notify ESP32 ({self.esp32_ip}): {e}"
            print(msg)
            log_esp_api(msg)

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
            msg = f"Turning ON signal {signal_id} direction: {direction}"
        else:
            msg = f"Turning ON signal {signal_id} (no direction info)"
        print(msg)
        log_esp_api(msg)
        try:
            resp = requests.post(f"http://{self.esp32_ip}/traffic-light-control", json=payload, timeout=2)
            msg = f"Sent command '{command}' to ESP32 ({self.esp32_ip}): {resp.status_code}"
            print(msg)
            log_esp_api(msg)
            return resp.status_code == 200
        except Exception as e:
            msg = f"Failed to send command to ESP32 ({self.esp32_ip}): {e}"
            print(msg)
            log_esp_api(msg)
            return False

    def send_revoke_green(self, signal_id, direction=None):
        payload = {
            "command": "revoke_green",
            "signal_id": signal_id,
        }
        if direction is not None:
            payload["direction"] = direction
        msg = f"Revoking green for signal {signal_id} direction: {direction}"
        print(msg)
        log_esp_api(msg)
        try:
            resp = requests.post(f"http://{self.esp32_ip}/traffic-light-control", json=payload, timeout=2)
            msg = f"Sent command 'revoke_green' to ESP32 ({self.esp32_ip}): {resp.status_code}"
            print(msg)
            log_esp_api(msg)
            return resp.status_code == 200
        except Exception as e:
            msg = f"Failed to send revoke_green to ESP32 ({self.esp32_ip}): {e}"
            print(msg)
            log_esp_api(msg)
            return False

    def test_connection(self):
        """Test if ESP32 API is reachable and working."""
        url = f"http://{self.esp32_ip}/traffic-light-control"
        payload = {
            "command": "set_green",
            "signal_id": "TEST",
            "duration": 10,
            "direction": "N"
        }
        try:
            resp = requests.post(url, json=payload, timeout=3)
            msg = f"[TEST] Sent test command to ESP32 ({self.esp32_ip}): {resp.status_code}, response: {resp.text}"
            print(msg)
            log_esp_api(msg)
            return resp.status_code == 200
        except Exception as e:
            msg = f"[TEST] Failed to send test command to ESP32 ({self.esp32_ip}): {e}"
            print(msg)
            log_esp_api(msg)
            return False

    def send_log_message(self, message: str, esp32_ip: str = None):
        """
        Send a log message to the ESP32_2 (or any ESP32 with /log-message endpoint).
        """
        ip = esp32_ip if esp32_ip else "192.168.43.101"
        payload = {"message": message}
        try:
            resp = requests.post(f"http://{ip}/log-message", json=payload, timeout=2)
            msg = f"Sent log message to ESP32 ({ip}): {resp.status_code}"
            print(msg)
            log_esp_api(msg)
            return resp.status_code == 200
        except Exception as e:
            msg = f"Failed to send log message to ESP32 ({ip}): {e}"
            print(msg)
            log_esp_api(msg)
            return False

# Test with: requests.post("http://192.168.43.100/traffic-light-control", json={"command":"set_green","signal_id":"TEST","duration":10,"direction":"N"})
