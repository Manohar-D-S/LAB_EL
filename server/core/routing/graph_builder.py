import osmnx as ox
from geopy.distance import great_circle
import logging
# from core.traffic import TrafficSimulator
import networkx as nx
# from functools import lru_cache

logger = logging.getLogger(__name__)

VEHICLE_FILTER = (
    '["highway"]["motor_vehicle"!~"no"]["motorcar"!~"no"]'
    '["access"!~"private"]["service"!~"parking|driveway"]'
    '["highway"!~"cycleway|footway|path|pedestrian|steps|track|corridor|bus_guideway|escape"]'
)

# @lru_cache(maxsize=1)
def build_simplified_graph(source: tuple, dest: tuple) -> nx.Graph:
    """Graph builder function"""
    try:
        logger.info(f"Building graph for source={source}, dest={dest}")
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
        return G
        
    except Exception as e:
        logger.error(f"Graph build failed: {str(e)}")
        raise