import heapq
from typing import List, Optional
import osmnx as ox
import networkx as nx

class EmergencyRouter:
    def __init__(self, graph):
        self.graph = graph
        # Pre-cache node coordinates for faster heuristic calculations
        self.node_coords = {n: (d['y'], d['x']) for n, d in graph.nodes(data=True)}

    def heuristic(self, u, v) -> float:
        """Calculate great-circle distance between nodes (in meters)"""
        u_lat, u_lon = self.node_coords[u]
        v_lat, v_lon = self.node_coords[v]
        return ox.distance.great_circle_vec(u_lat, u_lon, v_lat, v_lon)

    def astar(self, start: int, goal: int, use_traffic: bool = True) -> Optional[List[int]]:
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
                cost = self._get_edge_cost(current, neighbor, use_traffic)
                tentative_g = g_score[current] + cost
                
                if tentative_g < g_score[neighbor]:
                    came_from[neighbor] = current
                    g_score[neighbor] = tentative_g
                    f_score = tentative_g + self.heuristic(neighbor, goal)
                    heapq.heappush(open_set, (f_score, neighbor))
        
        return None

    def _get_edge_cost(self, u, v, use_traffic: bool) -> float:
        base_time = self.graph.edges[u,v,0].get('travel_time', 1.0)
        return base_time * (self.graph.edges[u,v,0].get('congestion', 1.0) if use_traffic else 1.0)

    def _reconstruct_path(self, came_from, current) -> List[int]:
        path = []
        while current in came_from:
            path.append(current)
            current = came_from[current]
        path.append(current)
        return path[::-1]