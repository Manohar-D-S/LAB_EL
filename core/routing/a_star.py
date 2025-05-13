import heapq
import networkx as nx
import osmnx as ox
from typing import List, Optional

class EmergencyRouter:
    def __init__(self, graph):
        """
        Initialize with an OSMnx graph
        Args:
            graph: OSMnx road network graph
        """
        self.graph = graph

    def heuristic(self, u, v) -> float:
        """
        Calculate straight-line distance between nodes
        (We'll optimize this later with traffic data)
        """
        u_lat, u_lon = self.graph.nodes[u]['y'], self.graph.nodes[u]['x']
        v_lat, v_lon = self.graph.nodes[v]['y'], self.graph.nodes[v]['x']
        return ox.distance.great_circle_vec(u_lat, u_lon, v_lat, v_lon)

    def astar(self, start: int, goal: int) -> Optional[List[int]]:
        """
        Basic A* implementation
        Returns:
            List of node IDs forming the path or None if no path exists
        """
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
                # Get edge travel time (default to 1 sec if missing)
                edge_data = self.graph.edges[current, neighbor, 0]
                cost = edge_data.get('travel_time', 1.0)
                
                tentative_g = g_score[current] + cost
                
                if tentative_g < g_score[neighbor]:
                    came_from[neighbor] = current
                    g_score[neighbor] = tentative_g
                    f_score = tentative_g + self.heuristic(neighbor, goal)
                    heapq.heappush(open_set, (f_score, neighbor))
        
        return None  # No path found

    def _reconstruct_path(self, came_from, current) -> List[int]:
        """Rebuild path from came_from dictionary"""
        path = []
        while current in came_from:
            path.append(current)
            current = came_from[current]
        path.append(current)
        return path[::-1]  # Reverse to get start->end