import osmnx as ox
from geopy.distance import great_circle
import logging
# from core.traffic import TrafficSimulator
import networkx as nx
# from functools import lru_cache
import numpy as np

logger = logging.getLogger(__name__)

VEHICLE_FILTER = (
    '["highway"]["motor_vehicle"!~"no"]["motorcar"!~"no"]'
    '["access"!~"private"]["service"!~"parking|driveway"]'
    '["highway"!~"cycleway|footway|path|pedestrian|steps|track|corridor|bus_guideway|escape"]'
)

def load_graph_from_file(graph_file: str) -> nx.MultiDiGraph:
    """
    Load the graph from a local file.
    """
    try:
        logger.info(f"Loading graph from file: {graph_file}")
        G = ox.load_graphml(graph_file)
        logger.info(f"Graph loaded with {len(G.nodes)} nodes and {len(G.edges)} edges.")
        return G
    except Exception as e:
        logger.error(f"Failed to load graph from file: {e}")
        raise

def extract_subgraph(G: nx.MultiDiGraph, source: tuple, dest: tuple) -> nx.MultiDiGraph:
    """
    Extract a subgraph from the main graph based on the bounding box.
    """
    try:
        logger.info(f"Extracting subgraph for source={source}, dest={dest}")
        north = max(source[0], dest[0]) + 0.02
        south = min(source[0], dest[0]) - 0.02
        east = max(source[1], dest[1]) + 0.02
        west = min(source[1], dest[1]) - 0.02

        subgraph = ox.truncate.truncate_graph_bbox(G, north=north, south=south, east=east, west=west)
        logger.info(f"Subgraph extracted with {len(subgraph.nodes)} nodes and {len(subgraph.edges)} edges.")
        return subgraph
    except Exception as e:
        logger.error(f"Failed to extract subgraph: {e}")
        raise

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