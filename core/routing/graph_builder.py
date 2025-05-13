import osmnx as ox
from geopy.distance import great_circle
import logging

logger = logging.getLogger(__name__)

def fetch_osm_graph(source: tuple, destination: tuple) -> ox.graph:
    """Fetch graph with automatic area adjustment"""
    try:
        # Calculate straight-line distance
        distance_km = great_circle(source, destination).km
        
        # Start with 1km buffer (minimum viable area)
        buffer_km = max(1.0, distance_km * 0.3)  # At least 1km, or 30% of route length
        
        # Try progressively larger areas until we get data
        for attempt in [1.0, 1.5, 2.0]:
            try:
                G = ox.graph_from_point(
                    center_point=source,
                    dist=buffer_km * attempt * 1000,  # Convert km to meters
                    network_type='drive',
                    simplify=True,
                    truncate_by_edge=True
                )
                if len(G.nodes) > 10:  # Ensure we got meaningful data
                    logger.info(f"Fetched graph with {len(G.nodes)} nodes")
                    G = ox.add_edge_speeds(G)
                    G = ox.add_edge_travel_times(G)
                    return G
            except Exception:
                continue
                
        raise ValueError("Could not fetch OSM data after multiple attempts")
        
    except Exception as e:
        logger.error(f"OSM fetch failed: {str(e)}")
        raise