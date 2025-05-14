import osmnx as ox
from geopy.distance import great_circle
import logging
from core.traffic import TrafficSimulator
import networkx as nx

logger = logging.getLogger(__name__)

VEHICLE_FILTER = (
    '["highway"]["motor_vehicle"!~"no"]["motorcar"!~"no"]'
    '["access"!~"private"]["service"!~"parking|driveway"]'
    '["highway"!~"cycleway|footway|path|pedestrian|steps|track|corridor|bus_guideway|escape"]'
)

def build_simplified_graph(source: tuple, dest: tuple, apply_traffic: bool = True) -> nx.Graph:
    """Build a simplified, ambulance-optimized road graph"""
    try:
        # Calculate bounding box with buffer
        north = max(source[0], dest[0]) + 0.02
        south = min(source[0], dest[0]) - 0.02
        east = max(source[1], dest[1]) + 0.02
        west = min(source[1], dest[1]) - 0.02
        
        # Fetch OSM data
        G = ox.graph_from_bbox(
            north, south, east, west,
            custom_filter=VEHICLE_FILTER,
            network_type='drive',
            retain_all=False
        )
        
        # Add speed and time attributes
        G = ox.add_edge_speeds(G)
        G = ox.add_edge_travel_times(G)
        
        # Apply traffic simulation if enabled
        if apply_traffic:
            G = TrafficSimulator.apply_constant_congestion(G)
        
        # Simplify graph
        G = ox.simplify_graph(G)
        
        logger.info(f"Built simplified graph with {len(G.nodes)} nodes")
        return G
        
    except Exception as e:
        logger.error(f"Graph build failed: {str(e)}")
        raise