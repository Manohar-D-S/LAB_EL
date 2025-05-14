import heapq
from typing import List, Optional, Dict, Any
import osmnx as ox
import networkx as nx
from core.metrics import calculate_route_metrics

class AmbulanceRouter:
    def __init__(self, graph):
        self.graph = graph
        self.node_coords = {n: (d['y'], d['x']) for n, d in graph.nodes(data=True)}

    def heuristic(self, u, v) -> float:
        """Calculate great-circle distance between nodes (in meters)"""
        u_lat, u_lon = self.node_coords[u]
        v_lat, v_lon = self.node_coords[v]
        return ox.distance.great_circle_vec(u_lat, u_lon, v_lat, v_lon)

    def find_route(self, start: int, goal: int) -> Dict[str, Any]:
        """Find route with metrics"""
        path = self.astar(start, goal)
        if not path:
            return None
            
        metrics = calculate_route_metrics(self.graph, path)
        return {
            'path': path,
            'distance_km': metrics['distance_km'],
            'time_mins': metrics['time_mins'],
            'nodes': [self.node_coords[n] for n in path]
        }

    def astar(self, start: int, goal: int) -> Optional[List[int]]:
        open_set = []
        heapq.heappush(open_set, (0, start))
        
        came_from = {}
        g_score = {node: float('inf') for node in self.graph.nodes}
        g_score[start] = 0
        
        while open_set:
            _, current = heapq.heappop(open_set)
            
            if current == goal:
                return self._reconstruct_path(came_from, current)
            
            for neighbor in self.graph.neighbors(current):
                cost = self._get_edge_cost(current, neighbor)
                tentative_g = g_score[current] + cost
                
                if tentative_g < g_score[neighbor]:
                    came_from[neighbor] = current
                    g_score[neighbor] = tentative_g
                    f_score = tentative_g + self.heuristic(neighbor, goal)
                    heapq.heappush(open_set, (f_score, neighbor))
        
        return None

    def _get_edge_cost(self, u, v) -> float:
        edge = self.graph.edges[u, v, 0]
        cost = edge.get('travel_time', 1.0)
        
        # Ambulance-specific adjustments
        highway_type = edge.get('highway', '')
        
        # Handle lanes (convert string to int)
        try:
            lanes = int(str(edge.get('lanes', '2')).split(';')[0])  # Handle values like "2;3"
        except ValueError:
            lanes = 2  # Default to 2 lanes if conversion fails
        
        # Apply modifiers
        if 'motorway' in highway_type:
            cost *= 0.8
        elif 'service' in highway_type:
            cost *= 1.5
        if lanes < 2:
            cost *= 1.2
        if 'traffic_signals' in edge:
            cost *= 1.1
            
        return cost

    def _reconstruct_path(self, came_from: Dict[int, int], current: int) -> List[int]:
        path = []
        while current in came_from:
            path.append(current)
            current = came_from[current]
        path.append(current)
        return path[::-1]