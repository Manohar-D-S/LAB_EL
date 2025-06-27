import networkx as nx
import heapq
import logging
from typing import List, Dict, Any, Tuple, Optional
import osmnx as ox
import time as time_module
from geopy.distance import geodesic
from core.routing.graph_builder import densify_route_path

# Check if CuPy is available
try:
    import cupy
    CUPY_AVAILABLE = True
except ImportError:
    CUPY_AVAILABLE = False

logger = logging.getLogger(__name__)

class DijkstraRouter:
    """
    Dijkstra's algorithm implementation for comparison with A* performance.
    """
    
    def __init__(self, graph: nx.MultiDiGraph, traffic_provider=None):
        self.graph = graph
        self.traffic_provider = traffic_provider
        logger.info(f"DijkstraRouter initialized with graph containing {len(self.graph.nodes)} nodes and {len(self.graph.edges)} edges.")

    def interpolate_point_on_edge(self, graph, edge, point):
        """
        Interpolate a point on an edge of the graph.
        
        Args:
            graph: NetworkX graph
            edge: Tuple of (u, v) representing the edge
            point: Tuple of (latitude, longitude) to interpolate
        
        Returns:
            Tuple of (latitude, longitude) of the interpolated point
        """
        if not edge or len(edge) < 2:
            return point
            
        u, v = edge[0], edge[1]
        u_point = (graph.nodes[u]['y'], graph.nodes[u]['x'])
        v_point = (graph.nodes[v]['y'], graph.nodes[v]['x'])
        
        # Calculate the interpolation
        total_dist = geodesic(u_point, v_point).meters
        if total_dist == 0:
            return u_point
            
        u_dist = geodesic(u_point, point).meters
        ratio = u_dist / total_dist
        
        # Interpolate the point
        lat = u_point[0] + ratio * (v_point[0] - u_point[0])
        lon = u_point[1] + ratio * (v_point[1] - u_point[1])
        
        return (lat, lon)

    def find_route(self, start_node: int, end_node: int) -> dict:
        start_time = time_module.perf_counter()
        logger.info(f"Finding route from node {start_node} to node {end_node} using Dijkstra's algorithm.")
        logger.info(f"Starting Dijkstra search from node {start_node} to node {end_node}.")
        
        # Initialize data structures
        distances = {node: float('inf') for node in self.graph.nodes()}
        distances[start_node] = 0
        
        previous: Dict[int, Optional[int]] = {node: None for node in self.graph.nodes()}
        
        priority_queue = [(0, start_node)]  # (distance, node)
        visited = set()
        visited_count = 0  # Counter for nodes that have been expanded
        
        while priority_queue:
            current_distance, current_node = heapq.heappop(priority_queue)
            
            if current_node in visited:
                continue
            
            visited.add(current_node)
            visited_count += 1
            
            if current_node == end_node:
                break
            
            for neighbor in self.graph.neighbors(current_node):
                if neighbor in visited:
                    continue
                
                # Get the edge with minimum travel_time
                edge_data = min(self.graph.get_edge_data(current_node, neighbor).values(), 
                                key=lambda x: x.get('travel_time', float('inf')))
                
                weight = edge_data.get('travel_time', 1000)  # Default high value if not found
                
                distance = current_distance + weight
                
                if distance < distances[neighbor]:
                    distances[neighbor] = distance
                    previous[neighbor] = current_node
                    heapq.heappush(priority_queue, (distance, neighbor))
        
        # Reconstruct path
        path = []
        current = end_node
        
        while current is not None:
            path.append(current)
            current = previous[current]
            
        path.reverse()
        
        if path[0] != start_node:
            # No path found
            logger.warning(f"No route found from node {start_node} to node {end_node}.")
            return {
                'path': [],
                'nodes': [],
                'distance_km': 0,
                'time_mins': 0
            }
        
        distance, time = self._calculate_route_metrics(path)
        # Densify the route using geometry
        densified_route = densify_route_path(self.graph, path)
        route_coords = [[pt['lat'], pt['lng']] for pt in densified_route]
        logger.info(f"Route found with distance {distance:.2f} km and time {time:.2f} minutes. Visited {visited_count} nodes.")
        elapsed = time_module.perf_counter() - start_time

        return {
            "algorithm": "Dijkstra",
            "time": elapsed,
            "nodes": visited_count,
            "distance": distance,
            "route": route_coords
        }
    
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
        """Get the coordinates for each node in the path."""
        return [(self.graph.nodes[node]['y'], self.graph.nodes[node]['x']) for node in path]
        computation_time = time.time() - start_time
        self._log_performance_metrics(path, computation_time)
        
        return path

    def _log_performance_metrics(self, path, computation_time):
        """Log performance metrics of the route calculation"""
        node_count = len(path)
        
        # Calculate the path distance
        if node_count > 1:
            distance_meters = sum(
                ox.distance.great_circle(
                    self.graph.nodes[path[i]]["y"], self.graph.nodes[path[i]]["x"],
                    self.graph.nodes[path[i + 1]]["y"], self.graph.nodes[path[i + 1]]["x"]
                )
                for i in range(len(path) - 1)
            )
            distance_km = distance_meters / 1000
        else:
            distance_km = 0
        
        # Print performance metrics to terminal
        print("\n========== DIJKSTRA ROUTE CALCULATION PERFORMANCE ==========")
        print(f"Algorithm computation time: {computation_time:.4f} seconds")
        print(f"Path length: {distance_km:.2f} km")
        print(f"Number of nodes in path: {node_count}")
        print("==========================================================\n")
        
        # Also log to the file
        logger.info(f"Dijkstra route calculated in {computation_time:.4f} seconds: {distance_km:.2f} km with {node_count} nodes")

    def _get_edge_cost(self, u, v, use_traffic=True):
        """
        Returns the cost for edge (u, v) with traffic conditions considered if use_traffic is True.
        """
        G = self.graph
        base_weight = G[u][v].get("weight", 1) if not G.is_multigraph() else G[u][v][0].get("weight", 1)
        
        if not use_traffic or not self.traffic_provider:
            return base_weight
            
        # Get coordinates for the edge midpoint
        u_lat, u_lng = G.nodes[u]["y"], G.nodes[u]["x"]
        v_lat, v_lng = G.nodes[v]["y"], G.nodes[v]["x"]
        mid_lat = (u_lat + v_lat) / 2
        mid_lng = (u_lng + v_lng) / 2
        
        # Use the shared traffic provider if available
        if self.traffic_provider and hasattr(self.traffic_provider, 'fetch_tomtom_traffic'):
            congestion = self.traffic_provider.fetch_tomtom_traffic(mid_lat, mid_lng)
        else:
            # Fall back to a default value if no traffic data
            congestion = 0.0
        
        if congestion is not None:
            # Adjust weight based on congestion (higher congestion = higher weight)
            traffic_weight = base_weight * (1 + 2 * congestion)  # Multiplier can be tuned
            return traffic_weight
        
        return base_weight

    def get_neighbors(self, node):
        """Get valid neighbors respecting one-way streets."""
        neighbors = []
        for neighbor, edge_data in self.graph[node].items():
            # Check if this is a valid edge considering one-way restrictions
            if isinstance(edge_data, dict):  # For non-multigraphs
                if edge_data.get('oneway', False) is True:
                    # For one-way streets, ensure we're going in the allowed direction
                    if edge_data.get('direction', 'forward') == 'forward':
                        neighbors.append(neighbor)
                else:
                    # For two-way streets, both directions are valid
                    neighbors.append(neighbor)
            else:  # For multigraphs
                for key, data in edge_data.items():
                    if data.get('oneway', False) is True:
                        if data.get('direction', 'forward') == 'forward':
                            neighbors.append(neighbor)
                            break
                    else:
                        neighbors.append(neighbor)
                        break
        return neighbors

    def _dijkstra_cpu(self, start, goal, use_traffic=True):
        """
        CPU implementation of Dijkstra's algorithm.
        """
        G = self.graph
        frontier = []
        heapq.heappush(frontier, (0, start))
        came_from = {start: None}
        cost_so_far = {start: 0}
        
        while frontier:
            _, current = heapq.heappop(frontier)
            
            if current == goal:
                break
                
            for neighbor in self.get_neighbors(current):
                # Get edge cost with traffic consideration
                weight = self._get_edge_cost(current, neighbor, use_traffic)
                new_cost = cost_so_far[current] + weight
                
                if neighbor not in cost_so_far or new_cost < cost_so_far[neighbor]:
                    cost_so_far[neighbor] = new_cost
                    # No heuristic in Dijkstra - that's the key difference from A*
                    priority = new_cost
                    heapq.heappush(frontier, (priority, neighbor))
                    came_from[neighbor] = current
        
        # Reconstruct path
        if goal not in came_from:
            logger.warning(f"No path found from {start} to {goal}")
            return []
            
        path = []
        node = goal
        while node is not None:
            path.append(node)
            node = came_from[node]
        path.reverse()
        
        logger.info(f"Dijkstra found path with {len(path)} nodes")
        return path

    def _dijkstra_gpu(self, start, goal, use_traffic=True):
        """
        GPU-accelerated implementation dispatcher for Dijkstra.
        Uses CuPy if available, otherwise falls back to Numba.
        """
        if CUPY_AVAILABLE:
            return self._dijkstra_gpu_cupy(start, goal, use_traffic)
        else:
            return self._dijkstra_gpu_numba(start, goal, use_traffic)
    
    def _dijkstra_gpu_cupy(self, start, goal, use_traffic=True):
        """
        Enhanced GPU-accelerated Dijkstra implementation using CuPy.
        The key difference from A* is that no heuristic is used.
        """
        import cupy as cp
        
        G = self.graph
        
        # Create mapping between node IDs and array indices
        nodes = list(G.nodes())
        node_to_idx = {node: i for i, node in enumerate(nodes)}
        idx_to_node = {i: node for i, node in enumerate(nodes)}
        
        # Precompute neighbor lists for faster lookup
        neighbors_list = {}
        for node in nodes:
            neighbors_list[node] = self.get_neighbors(node)
        
        # Dijkstra's algorithm main loop
        frontier = []
        heapq.heappush(frontier, (0, start))
        came_from = {start: None}
        cost_so_far = {start: 0}
        
        while frontier and len(frontier) < 100000:  # Safety limit
            _, current = heapq.heappop(frontier)
            
            if current == goal:
                break
            
            for neighbor in neighbors_list[current]:
                # Get edge cost with traffic consideration
                weight = self._get_edge_cost(current, neighbor, use_traffic)
                new_cost = cost_so_far[current] + weight
                
                if neighbor not in cost_so_far or new_cost < cost_so_far[neighbor]:
                    cost_so_far[neighbor] = new_cost
                    # No heuristic in Dijkstra
                    priority = new_cost
                    heapq.heappush(frontier, (priority, neighbor))
                    came_from[neighbor] = current
        
        # Reconstruct path
        if goal not in came_from:
            logger.warning(f"No path found from {start} to {goal}")
            return []
            
        path = []
        node = goal
        while node is not None:
            path.append(node)
            node = came_from[node]
        path.reverse()
        
        logger.info(f"GPU-accelerated Dijkstra (CuPy) found path with {len(path)} nodes")
        return path

    def _dijkstra_gpu_numba(self, start, goal, use_traffic=True):
        """
        GPU-accelerated implementation of Dijkstra using Numba.
        Unlike A*, Dijkstra does not use a heuristic.
        """
        from numba import cuda
        import numpy as np
        
        G = self.graph
        
        # Create mapping between node IDs and array indices
        nodes = list(G.nodes())
        node_to_idx = {node: i for i, node in enumerate(nodes)}
        idx_to_node = {i: node for i, node in enumerate(nodes)}
        
        # Precompute neighbor lists for faster lookup
        neighbors_list = {}
        for node in nodes:
            neighbors_list[node] = self.get_neighbors(node)
        
        # Dijkstra's algorithm main loop (on CPU since there's no heuristic to compute on GPU)
        frontier = []
        heapq.heappush(frontier, (0, start))
        came_from = {start: None}
        cost_so_far = {start: 0}
        
        while frontier:
            _, current = heapq.heappop(frontier)
            
            if current == goal:
                break
            
            for neighbor in neighbors_list[current]:
                # Get edge cost with traffic consideration
                weight = self._get_edge_cost(current, neighbor, use_traffic)
                new_cost = cost_so_far[current] + weight
                
                if neighbor not in cost_so_far or new_cost < cost_so_far[neighbor]:
                    cost_so_far[neighbor] = new_cost
                    # No heuristic in Dijkstra
                    priority = new_cost
                    heapq.heappush(frontier, (priority, neighbor))
                    came_from[neighbor] = current
        
        # Reconstruct path
        if goal not in came_from:
            logger.warning(f"No path found from {start} to {goal}")
            return []
            
        path = []
        node = goal
        while node is not None:
            path.append(node)
            node = came_from[node]
        path.reverse()
        
        logger.info(f"GPU-assisted Dijkstra (Numba) found path with {len(path)} nodes")
        return path

    def find_route_with_destination(self, start, goal, exact_source=None, exact_dest=None, 
                                  source_edge=None, dest_edge=None, use_traffic=True):
        """
        Find a route from start to goal with exact source and destination coordinates.
        Returns a complete path including the last mile to the exact destination.
        """
        start_time = time_module.time()  # Start timing
        logger.info(f"Finding route from {start} to {goal} with exact destination using Dijkstra.")
        
        # Get the basic path from node to node
        path = self._dijkstra_cpu(start, goal, use_traffic)
        
        if not path:
            logger.warning(f"No path found from node {start} to node {goal}.")
            return {'path': [], 'complete_path': [], 'path_coords': []}
        
        # Convert node IDs to coordinate points
        path_coords = [(self.graph.nodes[node]['y'], self.graph.nodes[node]['x']) for node in path]
        
        # If we have exact source/destination points, add them
        complete_path = list(path_coords)  # Make a copy
        
        # Add the exact source at the beginning if different from the start node
        if exact_source and source_edge:
            # Use local function instead of importing
            source_point = self.interpolate_point_on_edge(self.graph, source_edge, exact_source)
            if source_point != complete_path[0]:
                complete_path.insert(0, exact_source)  # Add the exact source coordinates
        
        # Add the exact destination at the end if different from the end node
        if exact_dest and dest_edge:
            # Use local function instead of importing
            dest_point = self.interpolate_point_on_edge(self.graph, dest_edge, exact_dest)
            if dest_point != complete_path[-1]:
                complete_path.append(exact_dest)  # Add the exact destination coordinates
        
        logger.info(f"Route found with {len(path)} nodes and {len(complete_path)} points including exact endpoints.")
        
        # Calculate the path distance
        if len(complete_path) > 1:
            from geopy.distance import geodesic
            distance_meters = sum(
                geodesic(point1, point2).meters
                for point1, point2 in zip(complete_path[:-1], complete_path[1:])
            )
            distance_km = distance_meters / 1000
        else:
            distance_km = 0
        
        # Calculate total computation time including last-mile routing
        total_computation_time = time_module.time() - start_time

        # Print performance including the last-mile calculation
        print("\n========== TOTAL DIJKSTRA ROUTE CALCULATION ==========")
        print(f"Total computation time (with last-mile): {total_computation_time:.4f} seconds")
        print(f"Complete path points: {len(complete_path)}")
        print(f"Distance: {distance_km:.2f} km")
        print("====================================================\n")
        
        logger.info(f"Complete Dijkstra route with last-mile calculated in {total_computation_time:.4f} seconds")
    
        # Return both the original node path and the complete coordinate path
        return {
            'path': path,
            'path_coords': path_coords,
            'complete_path': complete_path,
            'distance_km': distance_km,
            'computation_time': total_computation_time,
            'nodes': path
        }
