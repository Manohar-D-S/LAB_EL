import networkx as nx
import heapq
import numpy as np
import logging
from typing import List, Dict, Any, Tuple
from fastapi import HTTPException
from core.metrics import calculate_route_metrics
import osmnx as ox

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
        Calculate the straight-line distance between two nodes.
        This is the heuristic function for A* algorithm.
        """
        lat1, lng1 = self.graph.nodes[node1]['y'], self.graph.nodes[node1]['x']
        lat2, lng2 = self.graph.nodes[node2]['y'], self.graph.nodes[node2]['x']
        
        # Use Euclidean distance as a simple heuristic
        return np.sqrt((lat2 - lat1)**2 + (lng2 - lng1)**2)
    
    def find_route(self, start_node: int, end_node: int) -> Dict[str, Any]:
        """
        Find the shortest route from start_node to end_node using A* algorithm.
        Returns route information including path, distance, and time.
        """
        logger.info(f"Finding route from node {start_node} to node {end_node}.")
        
        # Initialize data structures for A*
        open_set = []  # Priority queue of nodes to be evaluated
        heapq.heappush(open_set, (0, start_node))  # (f_score, node)
        
        came_from = {}  # Maps a node to its predecessor
        
        g_score = {node: float('inf') for node in self.graph.nodes()}  # Cost from start to node
        g_score[start_node] = 0
        
        f_score = {node: float('inf') for node in self.graph.nodes()}  # g_score + heuristic
        f_score[start_node] = self.heuristic(start_node, end_node)
        
        open_set_hash = {start_node}  # Set of nodes in open_set for faster membership check
        
        while open_set:
            _, current = heapq.heappop(open_set)
            open_set_hash.remove(current)
            
            if current == end_node:
                # Reconstruct path
                path = self._reconstruct_path(came_from, current)
                distance, time = self._calculate_route_metrics(path)
                
                # Get coordinate nodes for visualization
                nodes = self._get_path_coordinates(path)
                
                logger.info(f"Route found: {len(path)} nodes, {distance:.2f} km, {time:.2f} mins.")
                return {
                    'path': path,
                    'nodes': nodes,
                    'distance_km': distance,
                    'time_mins': time
                }
            
            # Explore neighbors
            for neighbor in self.graph.neighbors(current):
                # Get the edge with minimum travel_time
                edge_data = min(self.graph.get_edge_data(current, neighbor).values(), 
                                key=lambda x: x.get('travel_time', float('inf')))
                
                travel_time = edge_data.get('travel_time', 1000)  # Default high value if not found
                
                # Calculate tentative g_score
                tentative_g_score = g_score[current] + travel_time
                
                if tentative_g_score < g_score[neighbor]:
                    # This path is better
                    came_from[neighbor] = current
                    g_score[neighbor] = tentative_g_score
                    f_score[neighbor] = tentative_g_score + self.heuristic(neighbor, end_node)
                    
                    if neighbor not in open_set_hash:
                        heapq.heappush(open_set, (f_score[neighbor], neighbor))
                        open_set_hash.add(neighbor)
        
        # No path found
        logger.warning(f"No route found from node {start_node} to node {end_node}.")
        raise HTTPException(status_code=404, detail="No path found between the source and destination")
    
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

    def astar(self, start_node: int, end_node: int) -> List[int]:
        """
        A* algorithm implementation for finding the shortest path.
        Returns the path as a list of node IDs.
        """
        if start_node == end_node:
            return [start_node]
        
        logger.info(f"Finding path from {start_node} to {end_node} using A* algorithm")
        
        # Priority queue of (f_score, node_id)
        open_set = []
        heapq.heappush(open_set, (0, start_node))
        
        # Maps a node to its previous node in the optimal path
        came_from = {}
        
        # g_score[n] is the cost of the cheapest path from start to n currently known
        g_score = {node: float('inf') for node in self.graph.nodes()}
        g_score[start_node] = 0
        
        # f_score[n] = g_score[n] + h(n)
        f_score = {node: float('inf') for node in self.graph.nodes()}
        f_score[start_node] = self.heuristic(start_node, end_node)
        
        # Set to keep track of nodes in the open_set
        open_set_hash = {start_node}
        
        while open_set:
            # Get the node with the lowest f_score
            _, current = heapq.heappop(open_set)
            open_set_hash.remove(current)
            
            if current == end_node:
                # Reconstruct the path
                path = []
                while current in came_from:
                    path.append(current)
                    current = came_from[current]
                path.append(start_node)
                path.reverse()
                logger.info(f"Path found with {len(path)} nodes")
                return path
            
            # Check all neighbors
            for neighbor in self.graph.neighbors(current):
                # Get the edge with minimum travel_time (in case of multigraph)
                edge_data = min(
                    self.graph.get_edge_data(current, neighbor).values(),
                    key=lambda x: x.get('travel_time', float('inf'))
                )
                
                # Get the travel time from current to neighbor
                travel_time = edge_data.get('travel_time', 1.0)
                
                # Tentative g_score
                tentative_g_score = g_score[current] + travel_time
                
                if tentative_g_score < g_score[neighbor]:
                    # This path is better than any previous one
                    came_from[neighbor] = current
                    g_score[neighbor] = tentative_g_score
                    f_score[neighbor] = tentative_g_score + self.heuristic(neighbor, end_node)
                    
                    if neighbor not in open_set_hash:
                        heapq.heappush(open_set, (f_score[neighbor], neighbor))
                        open_set_hash.add(neighbor)
        
        # No path found
        logger.error(f"No path found from {start_node} to {end_node}")
        return []