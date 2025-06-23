import osmnx as ox
import networkx as nx
import numpy as np
from typing import Tuple, Any

def snap_to_nearest_node(graph: nx.Graph, point: Tuple[float, float]) -> Any:
    """
    Find the nearest node in the graph to the given point.
    
    Args:
        graph: A NetworkX graph
        point: A tuple of (latitude, longitude)
        
    Returns:
        The ID of the nearest node
    """
    lat, lng = point
    
    # Calculate distance to all nodes
    min_dist = float('inf')
    nearest_node = None
    
    for node, data in graph.nodes(data=True):
        node_lat = data.get('y', data.get('lat', 0))
        node_lng = data.get('x', data.get('lon', 0))
        
        # Simple Euclidean distance (sufficient for nearby points)
        dist = np.sqrt((lat - node_lat)**2 + (lng - node_lng)**2)
        
        if dist < min_dist:
            min_dist = dist
            nearest_node = node
    
    return nearest_node

# core/utils.py
def validate_graph(G):
    if not G or len(G.nodes) == 0:
        raise ValueError("Invalid graph - empty road network")
    if not nx.is_strongly_connected(G.to_directed()):
        print("⚠️ Warning: Graph contains disconnected components")
        print("⚠️ Warning: Graph contains disconnected components")