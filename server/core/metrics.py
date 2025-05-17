from typing import Dict, Any
import networkx as nx

def calculate_route_metrics(G: nx.Graph, path: list) -> Dict[str, Any]:
    """Calculate comprehensive route metrics"""
    if not path or len(path) < 2:
        return {
            'distance_km': 0,
            'time_mins': 0,
            'node_count': 0
        }
    
    total_length = 0
    total_time = 0
    road_types = {}
    
    for u, v in zip(path[:-1], path[1:]):
        edge = G.edges[u, v, 0]
        total_length += edge['length']
        total_time += edge.get('travel_time', edge['length'] / 13.89)  # 13.89 m/s ≈ 50 km/h
        
        # Track road type distribution
        road_type = edge.get('highway', 'unknown')
        if isinstance(road_type, list):
            road_type = road_type[0]
        road_types[road_type] = road_types.get(road_type, 0) + edge['length']
    
    return {
        'distance_km': round(total_length/1000, 2),
        'time_mins': round(total_time/60, 1),
        'node_count': len(path),
        'road_types': road_types
    }