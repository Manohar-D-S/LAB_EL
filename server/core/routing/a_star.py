import heapq
from typing import List, Optional, Dict, Any
import osmnx as ox
import networkx as nx
from core.metrics import calculate_route_metrics
import logging

logger = logging.getLogger(__name__)

class AmbulanceRouter:
    def __init__(self, graph: nx.MultiDiGraph):
        self.graph = graph
        self.node_coords = {n: (d['y'], d['x']) for n, d in graph.nodes(data=True)}
        logger.info(f"AmbulanceRouter initialized with graph containing {len(graph.nodes)} nodes and {len(graph.edges)} edges.")

    def heuristic(self, u, v) -> float:
        """Calculate great-circle distance between nodes (in meters)"""
        u_lat, u_lon = self.node_coords[u]
        v_lat, v_lon = self.node_coords[v]
        distance = ox.distance.great_circle_vec(u_lat, u_lon, v_lat, v_lon)
        logger.debug(f"Heuristic calculated between nodes {u} and {v}: {distance:.2f} meters.")
        return distance

    def find_route(self, start: int, goal: int) -> Dict[str, Any]:
        """Find route with metrics"""
        logger.info(f"Finding route from node {start} to node {goal}.")
        path = self.astar(start, goal)
        if not path:
            logger.warning(f"No path found from node {start} to node {goal}.")
            return None
            
        metrics = calculate_route_metrics(self.graph, path)
        logger.info(f"Route found with distance {metrics['distance_km']:.2f} km and time {metrics['time_mins']:.2f} minutes.")
        return {
            'path': path,
            'distance_km': metrics['distance_km'],
            'time_mins': metrics['time_mins'],
            'nodes': [self.node_coords[n] for n in path]
        }

    def astar(self, start_node: int, end_node: int) -> list:
        """
        Find the shortest path using the A* algorithm.
        """
        logger.info(f"Starting A* search from node {start_node} to node {end_node}.")
        try:
            path = nx.astar_path(
                self.graph,
                start_node,
                end_node,
                heuristic=lambda u, v: ox.distance.euclidean_dist_vec(
                    self.graph.nodes[u]["y"], self.graph.nodes[u]["x"],
                    self.graph.nodes[v]["y"], self.graph.nodes[v]["x"]
                ),
                weight="travel_time"  # Use travel_time or length as the weight
            )
            logger.info(f"A* search completed. Path found: {path}")
            return path
        except nx.NetworkXNoPath:
            logger.error(f"No path found between {start_node} and {end_node}.")
            raise HTTPException(status_code=404, detail="No path found between the source and destination")

    def _get_edge_cost(self, u, v) -> float:
        edge = self.graph.edges[u, v, 0]
        cost = edge.get('travel_time', 1.0)
        logger.debug(f"Initial edge cost between nodes {u} and {v}: {cost}")

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
            logger.debug(f"Motorway detected. Adjusted cost: {cost}")
        elif 'service' in highway_type:
            cost *= 1.5
            logger.debug(f"Service road detected. Adjusted cost: {cost}")
        if lanes < 2:
            cost *= 1.2
            logger.debug(f"Single-lane road detected. Adjusted cost: {cost}")
        if 'traffic_signals' in edge:
            cost *= 1.1
            logger.debug(f"Traffic signal detected. Adjusted cost: {cost}")
            
        logger.debug(f"Final edge cost between nodes {u} and {v}: {cost}")
        return cost

    def _reconstruct_path(self, came_from: Dict[int, int], current: int) -> List[int]:
        path = []
        logger.debug(f"Reconstructing path starting from node {current}.")
        while current in came_from:
            path.append(current)
            current = came_from[current]
        path.append(current)
        logger.debug(f"Path reconstructed: {path[::-1]}")
        return path[::-1]