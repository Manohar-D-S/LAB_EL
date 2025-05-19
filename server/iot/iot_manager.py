class IOTManager:
    def __init__(self, signal_processor, esp32_communicator):
        self.signal_processor = signal_processor
        self.esp32_communicator = esp32_communicator

    def handle_proximity(self, data: dict):
        # Process the proximity event
        self.signal_processor.process_proximity(data)
        # Notify the ESP32 device
        self.esp32_communicator.notify_signal(data)
