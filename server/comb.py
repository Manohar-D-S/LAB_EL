import os
import json
import logging
from itertools import combinations
from hashlib import sha256
from time import time
import networkx as nx

# Import your existing modules
from core.routing.graph_builder import load_graph_from_file, extract_subgraph
from core.routing.a_star import AmbulanceRouter
from core.routing.dijkstra import DijkstraRouter
from utils.geo_helpers import snap_to_nearest_node

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Location data
LOCATIONS = [
    {"id": "LakshmiHospital", "name": "Lakshmi Hospital", "lat": 12.988345, "lng": 77.508878},
    {"id": "Kamakshipalya", "name": "Kamakshipalya", "lat": 12.982516, "lng": 77.529095},
    {"id": "SanjeeviniHospital", "name": "Sanjeevini Hospital", "lat": 12.982157, "lng": 77.598217},
    {"id": "MythicSociety", "name": "Mythic Society", "lat": 12.972791, "lng": 77.586308},
    {"id": "VetCollege", "name": "Vet College", "lat": 12.907877, "lng": 77.592391},
    {"id": "JayadevaHospital", "name": "Jayadeva Hospital", "lat": 12.917924, "lng": 77.599245},
    {"id": "SparshHospital", "name": "Sparsh Hospital", "lat": 13.0277298, "lng": 77.5428356},
    {"id": "Narayana Hrudayalaya", "name": "Narayana Hrudayalaya", "lat": 12.9238254, "lng": 77.6508147},
    {"id": "NIMHANS", "name": "NIMHANS", "lat": 12.940071, "lng": 77.593115}
]

# Cache directory
CACHE_DIR = os.path.join(os.path.dirname(__file__), "route_cache")
os.makedirs(CACHE_DIR, exist_ok=True)

def generate_cache_key(source_tuple, dest_tuple):
    """Generate a consistent cache key for a route"""
    key_string = f"{source_tuple[0]:.6f}-{source_tuple[1]:.6f}-{dest_tuple[0]:.6f}-{dest_tuple[1]:.6f}"
    return sha256(key_string.encode()).hexdigest()

def save_route_to_cache(cache_key, route_data):
    """Save route data to persistent cache"""
    cache_file = os.path.join(CACHE_DIR, f"{cache_key}.json")
    try:
        with open(cache_file, 'w') as f:
            json.dump(route_data, f, indent=2)
        logger.info(f"Route cached: {cache_file}")
    except Exception as e:
        logger.error(f"Failed to save cache {cache_key}: {e}")

def load_route_from_cache(cache_key):
    """Load route data from persistent cache"""
    cache_file = os.path.join(CACHE_DIR, f"{cache_key}.json")
    if os.path.exists(cache_file):
        try:
            with open(cache_file, 'r') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Failed to load cache {cache_key}: {e}")
    return None

def calculate_and_cache_route(graph, source_loc, dest_loc):
    """Calculate route between two locations and cache the result"""
    source_tuple = (source_loc["lat"], source_loc["lng"])
    dest_tuple = (dest_loc["lat"], dest_loc["lng"])
    
    cache_key = generate_cache_key(source_tuple, dest_tuple)
    
    # Check if already cached
    cached_route = load_route_from_cache(cache_key)
    if cached_route:
        logger.info(f"Cache hit: {source_loc['name']} -> {dest_loc['name']}")
        return cached_route
    
    logger.info(f"Calculating route: {source_loc['name']} -> {dest_loc['name']}")
    
    try:
        # Extract subgraph
        subgraph = extract_subgraph(graph, source_tuple, dest_tuple)
        
        # Snap to nearest nodes
        start_node = snap_to_nearest_node(subgraph, source_tuple)
        end_node = snap_to_nearest_node(subgraph, dest_tuple)
        
        # Calculate routes using both algorithms
        astar_router = AmbulanceRouter(subgraph)
        dijkstra_router = DijkstraRouter(subgraph)
        
        astar_result = astar_router.find_route(start_node, end_node)
        dijkstra_result = dijkstra_router.find_route(start_node, end_node)
        
        # Prepare response data
        route_data = {
            "source": source_loc,
            "destination": dest_loc,
            "cache_key": cache_key,
            "calculated_at": time(),
            "results": [
                {
                    "algorithm": "A*",
                    "time": astar_result.get("time", 0),
                    "nodes": astar_result.get("nodes", 0),
                    "distance": astar_result.get("distance", 0),
                    "route": astar_result.get("route", [])
                },
                {
                    "algorithm": "Dijkstra",
                    "time": dijkstra_result.get("time", 0),
                    "nodes": dijkstra_result.get("nodes", 0),
                    "distance": dijkstra_result.get("distance", 0),
                    "route": dijkstra_result.get("route", [])
                }
            ]
        }
        
        # Save to cache
        save_route_to_cache(cache_key, route_data)
        
        return route_data
        
    except Exception as e:
        logger.error(f"Failed to calculate route {source_loc['name']} -> {dest_loc['name']}: {e}")
        return None

def precompute_all_routes():
    """Precompute and cache all possible routes between locations"""
    # Load graph once at the beginning
    graph_file = "./data/simplified_bengaluru.graphml"
    if not os.path.exists(graph_file):
        logger.error(f"Graph file not found: {graph_file}")
        return
    
    logger.info(f"Loading graph from {graph_file}...")
    graph = load_graph_from_file(graph_file)
    logger.info(f"Graph loaded with {len(graph.nodes)} nodes and {len(graph.edges)} edges")
    
    # Generate all possible source-destination pairs
    total_pairs = len(LOCATIONS) * (len(LOCATIONS) - 1)
    completed = 0
    failed = 0
    cached = 0
    
    logger.info(f"Starting precomputation of {total_pairs} routes...")
    
    for source_loc in LOCATIONS:
        for dest_loc in LOCATIONS:
            if source_loc["id"] == dest_loc["id"]:
                continue  # Skip same location
            
            # Check if already cached
            source_tuple = (source_loc["lat"], source_loc["lng"])
            dest_tuple = (dest_loc["lat"], dest_loc["lng"])
            cache_key = generate_cache_key(source_tuple, dest_tuple)
            
            if load_route_from_cache(cache_key):
                cached += 1
                logger.info(f"Already cached ({cached + completed + 1}/{total_pairs}): {source_loc['name']} -> {dest_loc['name']}")
                continue
            
            # Calculate and cache the route
            result = calculate_and_cache_route(graph, source_loc, dest_loc)
            
            if result:
                completed += 1
                logger.info(f"Completed ({cached + completed + 1}/{total_pairs}): {source_loc['name']} -> {dest_loc['name']}")
            else:
                failed += 1
                logger.error(f"Failed ({cached + completed + failed + 1}/{total_pairs}): {source_loc['name']} -> {dest_loc['name']}")
    
    # Summary
    logger.info("=" * 60)
    logger.info("PRECOMPUTATION COMPLETE")
    logger.info(f"Total routes processed: {total_pairs}")
    logger.info(f"Already cached: {cached}")
    logger.info(f"Newly computed: {completed}")
    logger.info(f"Failed: {failed}")
    logger.info(f"Cache directory: {CACHE_DIR}")
    logger.info("=" * 60)

def get_cached_route(source_lat, source_lng, dest_lat, dest_lng):
    """Retrieve a cached route by coordinates"""
    cache_key = generate_cache_key((source_lat, source_lng), (dest_lat, dest_lng))
    return load_route_from_cache(cache_key)

def list_cached_routes():
    """List all cached routes"""
    cache_files = [f for f in os.listdir(CACHE_DIR) if f.endswith('.json')]
    logger.info(f"Found {len(cache_files)} cached routes in {CACHE_DIR}")
    
    for cache_file in cache_files[:10]:  # Show first 10
        cache_path = os.path.join(CACHE_DIR, cache_file)
        try:
            with open(cache_path, 'r') as f:
                route_data = json.load(f)
                source_name = route_data.get("source", {}).get("name", "Unknown")
                dest_name = route_data.get("destination", {}).get("name", "Unknown")
                logger.info(f"  {cache_file}: {source_name} -> {dest_name}")
        except Exception as e:
            logger.error(f"  {cache_file}: Error reading - {e}")
    
    if len(cache_files) > 10:
        logger.info(f"  ... and {len(cache_files) - 10} more")

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "--list":
        list_cached_routes()
    else:
        precompute_all_routes()