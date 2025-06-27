import networkx as nx
import heapq
import numpy as np
import logging
import time as time_module
from typing import List, Dict, Any, Tuple
from fastapi import HTTPException
from core.metrics import calculate_route_metrics
from core.routing.graph_builder import densify_route_path
import math

logger = logging.getLogger(__name__)

class AmbulanceRouter:
    """
    A* algorithm implementation for emergency vehicle routing.
    """
    
    def __init__(self, graph: nx.MultiDiGraph):
        self.graph = graph
        self.nodes = list(graph.nodes())
        logger.info(f"AmbulanceRouter initialized with graph containing {len(self.graph.nodes)} nodes and {len(self.graph.edges)} edges.")

    def heuristic(self, node1: int, node2: int) -> float:
        """
        Calculate Euclidean distance heuristic (much faster than geodesic).
        This is admissible and much more efficient for A*.
        """
        lat1, lng1 = self.graph.nodes[node1]['y'], self.graph.nodes[node1]['x']
        lat2, lng2 = self.graph.nodes[node2]['y'], self.graph.nodes[node2]['x']
        
        # Simple Euclidean distance (faster than geodesic)
        # Convert to approximate meters using lat/lng degree distances
        lat_diff_m = (lat2 - lat1) * 111320  # ~111.32 km per degree latitude
        lng_diff_m = (lng2 - lng1) * 111320 * abs(math.cos(math.radians((lat1 + lat2) / 2)))
        
        distance_m = math.sqrt(lat_diff_m**2 + lng_diff_m**2)
        avg_speed_mps = 8.33  # ~30 km/h
        return distance_m / avg_speed_mps
    
    def find_route(self, start_node: int, end_node: int) -> dict:
        """A* with performance debugging (replaces previous logic, keeps DS and function name the same)"""
        start_time = time_module.perf_counter()
        heuristic_time = 0
        neighbor_time = 0
        
        # Initialize data structures for A*
        open_set = []  # Priority queue of nodes to be evaluated
        heapq.heappush(open_set, (0, start_node))  # (f_score, node)
        
        came_from = {}  # Maps a node to its predecessor
        
        g_score = {node: float('inf') for node in self.graph.nodes()}  # Cost from start to node
        g_score[start_node] = 0
        
        f_score = {node: float('inf') for node in self.graph.nodes()}  # g_score + heuristic
        f_score[start_node] = self.heuristic(start_node, end_node)
        
        open_set_hash = {start_node}  # Set of nodes in open_set for faster membership check
        
        visited_count = 0  # Counter for nodes that have been expanded
        path = []  # Initialize path
        visited_nodes = set()
        
        while open_set:
            _, current = heapq.heappop(open_set)
            open_set_hash.remove(current)
            visited_count += 1
            visited_nodes.add(current)
            
            if current == end_node:
                # Found the goal - reconstruct path and break
                path = self._reconstruct_path(came_from, current)
                break
            
            # Explore neighbors
            neighbor_start = time_module.perf_counter()
            for neighbor in self.graph.neighbors(current):
                # Get the edge with minimum travel_time
                edge_data = min(self.graph.get_edge_data(current, neighbor).values(), 
                                key=lambda x: x.get('travel_time', float('inf')))
                
                travel_time = edge_data.get('travel_time', 1000)  # Default high value if not found
                
                # Calculate tentative g_score
                tentative_g_score = g_score[current] + travel_time
                
                if tentative_g_score < g_score[neighbor]:
                    came_from[neighbor] = current
                    g_score[neighbor] = tentative_g_score
                    
                    # Time the heuristic calculation
                    heur_start = time_module.perf_counter()
                    heuristic_cost = self.heuristic(neighbor, end_node)
                    heuristic_time += time_module.perf_counter() - heur_start
                    
                    f_score[neighbor] = tentative_g_score + heuristic_cost
                    
                    if neighbor not in open_set_hash:
                        heapq.heappush(open_set, (f_score[neighbor], neighbor))
                        open_set_hash.add(neighbor)
            
            neighbor_time += time_module.perf_counter() - neighbor_start
        
        # Record core algorithm time (excluding densification)
        core_algorithm_time = time_module.perf_counter() - start_time
        
        # Check if path was found
        if not path:
            logger.warning(f"No route found from node {start_node} to node {end_node}.")
            raise HTTPException(status_code=404, detail="No path found between the source and destination")
        
        # Debug timing for core algorithm
        print(f"A* Debug - Core algorithm time: {core_algorithm_time:.4f}s")
        print(f"A* Debug - Total heuristic time: {heuristic_time:.4f}s")
        print(f"A* Debug - Total neighbor processing: {neighbor_time:.4f}s")
        print(f"A* Debug - Nodes visited: {visited_count}")
        
        # Calculate route metrics
        distance, time = self._calculate_route_metrics(path)
        
        # Now do the expensive densification (outside of core algorithm timing)
        densification_start = time_module.perf_counter()
        densified_route = densify_route_path(self.graph, path)
        route_coords = [[pt['lat'], pt['lng']] for pt in densified_route]
        densification_time = time_module.perf_counter() - densification_start
        
        # Total elapsed time including densification
        total_elapsed = time_module.perf_counter() - start_time
        
        print(f"A* Debug - Densification time: {densification_time:.4f}s")
        print(f"A* Debug - Total time (with densification): {total_elapsed:.4f}s")
        
        logger.info(f"Route found: {len(path)} nodes, {distance:.2f} km, {time:.2f} mins. Visited {visited_count} nodes.")
        
        return {
            "algorithm": "A*",
            "time": core_algorithm_time,  # Return core algorithm time for fair comparison
            "total_time": total_elapsed,  # Also provide total time if needed
            "densification_time": densification_time,
            "nodes": visited_count,
            "distance": distance,
            "route": route_coords,
            "visited_nodes": list(visited_nodes)
        }
    
    def _reconstruct_path(self, came_from: Dict[int, int], current: int) -> List[int]:
        """Reconstruct the path from start to end node."""
        path = [current]
        while current in came_from:
            current = came_from[current]
            path.append(current)
        return path[::-1]  # Reverse to get path from start to end
    
    def _calculate_route_metrics(self, path: List[int]) -> Tuple[float, float]:
        """Calculate total distance (km) and time (minutes) for the route."""
        if not path or len(path) < 2:
            return 0.0, 0.0
        
        total_distance = 0.0  # in meters
        total_time = 0.0  # in seconds
        
        for i in range(len(path) - 1):
            node1, node2 = path[i], path[i + 1]
            
            # Get the edge with minimum travel_time
            edge_data = min(self.graph.get_edge_data(node1, node2).values(), 
                            key=lambda x: x.get('travel_time', float('inf')))
            
            distance = edge_data.get('length', 0.0)  # in meters
            time = edge_data.get('travel_time', 0.0)  # in seconds
            
            total_distance += distance
            total_time += time
        
        # Convert to km and minutes
        total_distance_km = total_distance / 1000.0
        total_time_mins = total_time / 60.0
        
        return total_distance_km, total_time_mins
    
    def _get_path_coordinates(self, path: List[int]) -> List[Tuple[float, float]]:
        """Convert path node IDs to their corresponding coordinates."""
        coordinates = []
        for node_id in path:
            lat = self.graph.nodes[node_id]['y']
            lng = self.graph.nodes[node_id]['x']
            coordinates.append((lat, lng))
        return coordinates