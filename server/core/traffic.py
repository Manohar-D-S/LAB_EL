# core/traffic.py
class TrafficSimulator:
    @staticmethod
    def apply_constant_congestion(G):
        """Add fixed traffic values to different road types"""
        for _, _, data in G.edges(data=True):
            road_type = data.get('highway', 'unclassified')
            
            # Set base speed (km/h) based on road type
            if 'motorway' in road_type:
                base_speed = 60
                congestion_factor = 0.8  # 20% speed reduction
            elif 'primary' in road_type:
                base_speed = 40
                congestion_factor = 0.7
            elif 'secondary' in road_type:
                base_speed = 30
                congestion_factor = 0.6
            else:  # residential/tertiary
                base_speed = 20
                congestion_factor = 0.5
                
            # Calculate effective speed and travel time
            effective_speed = base_speed * congestion_factor
            data['travel_time'] = (data['length'] / 1000) / effective_speed * 3600  # in seconds
        
        return G