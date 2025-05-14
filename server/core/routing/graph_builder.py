import osmnx as ox
from geopy.distance import great_circle
import logging

logger = logging.getLogger(__name__)

VEHICLE_FILTER = (
    '["highway"]["motor_vehicle"!~"no"]["motorcar"!~"no"]'
    '["access"!~"private"]["service"!~"parking|driveway"]'
    '["highway"!~"cycleway|footway|path|pedestrian|steps|track|corridor|bus_guideway|escape"]'
)

def build_simplified_graph(source: tuple, dest: tuple) -> ox.graph:
    """Fetch ambulance-accessible roads only (previously fetch_vehicle_graph)"""
    try:
        north = max(source[0], dest[0]) + 0.02
        south = min(source[0], dest[0]) - 0.02
        east = max(source[1], dest[1]) + 0.02
        west = min(source[1], dest[1]) - 0.02
        
        G = ox.graph_from_bbox(
            north, south, east, west,
            custom_filter=VEHICLE_FILTER,
            network_type='drive',
            retain_all=False
        )
        
        G = ox.add_edge_speeds(G)
        G = ox.add_edge_travel_times(G)
        logger.info(f"Fetched vehicle graph with {len(G.nodes)} nodes")
        return G
        
    except Exception as e:
        logger.error(f"Vehicle graph fetch failed: {str(e)}")
        raise