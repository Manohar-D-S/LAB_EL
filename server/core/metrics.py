# core/metrics.py
def calculate_route_metrics(G, path):
    """Calculate distance and time metrics for a path"""
    total_length = 0
    total_time = 0
    
    for u, v in zip(path[:-1], path[1:]):
        edge = G.edges[u, v, 0]
        total_length += edge['length']
        total_time += edge.get('travel_time', edge['length'] / 13.89)  # 13.89 m/s ≈ 50 km/h
        
    return {
        'distance_km': round(total_length/1000, 2),
        'time_mins': round(total_time/60, 1)
    }