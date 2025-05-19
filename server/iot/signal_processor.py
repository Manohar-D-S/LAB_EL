class SignalProcessor:
    def __init__(self, graph):
        self.graph = graph

    def process_proximity(self, data: dict):
        signal_id = data.get("signalId")
        name = data.get("name")
        lat = data.get("lat")
        lng = data.get("lng")
        distance = data.get("distance")
        # You can now use these fields as needed
        # Example: log or trigger actions
        print(f"Ambulance near signal {signal_id} ({name}) at ({lat}, {lng}), distance: {distance}m")