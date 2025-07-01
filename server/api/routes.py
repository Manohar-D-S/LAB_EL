import os
import json
import logging
import requests
from fastapi import APIRouter, HTTPException, Depends, Request, FastAPI
from fastapi.responses import JSONResponse
from typing import Dict, Any, Tuple, List
from hashlib import sha256
import matplotlib.pyplot as plt
import osmnx as ox
from datetime import datetime
from time import sleep

from core.routing.graph_builder import  load_graph_from_file, extract_subgraph, visualize_dijkstra_points, visualize_astar_points
from core.routing.a_star import AmbulanceRouter
from core.routing.dijkstra import DijkstraRouter
from utils.geo_helpers import snap_to_nearest_node
from api.schemas import RouteRequest,  RouteComparisonResponse

router = APIRouter()
logger = logging.getLogger(__name__)

#logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("server_logs.log"),  # Save logs to a file
        logging.StreamHandler()  # Print logs to the console
    ]
)

# In-memory cache for routes
route_cache: Dict[str, Any] = {}

# Persistent cache directory
CACHE_DIR = os.path.join(os.path.dirname(__file__), "..", "route_cache")
os.makedirs(CACHE_DIR, exist_ok=True)

def generate_cache_key(source: Tuple[float, float], destination: Tuple[float, float]) -> str:
    """Generate a unique cache key based on source and destination coordinates."""
    key = f"{source[0]}-{source[1]}-{destination[0]}-{destination[1]}"
    return sha256(key.encode()).hexdigest()

def load_route_from_persistent_cache(cache_key: str):
    """Load route data from persistent file cache"""
    cache_file = os.path.join(CACHE_DIR, f"{cache_key}.json")
    if os.path.exists(cache_file):
        try:
            with open(cache_file, 'r') as f:
                data = json.load(f)
                logger.info(f"Persistent cache hit for key: {cache_key}")
                return data
        except Exception as e:
            logger.error(f"Failed to load persistent cache {cache_key}: {e}")
    return None

def save_route_to_persistent_cache(cache_key: str, route_data: dict):
    """Save route data to persistent file cache"""
    cache_file = os.path.join(CACHE_DIR, f"{cache_key}.json")
    try:
        with open(cache_file, 'w') as f:
            json.dump(route_data, f, indent=2)
        logger.info(f"Route saved to persistent cache: {cache_file}")
    except Exception as e:
        logger.error(f"Failed to save to persistent cache {cache_key}: {e}")

@router.get("/router-test")
def router_test():
    logger.info("Router test endpoint was called.")
    return {"message": "Router test route works!"}

@router.get("/routes")
async def get_routes():
    logger.info("Fetching routes. No predefined routes will be returned.")
    return {"routes": []}  # Return an empty list or remove this endpoint entirely

@router.post("/routes", response_model=RouteComparisonResponse)
async def calculate_route(request: Request, route_request: RouteRequest):
    # Ensure the bangalore_map.graphml file exists
    data_folder = os.path.join(os.getcwd(), "data")
    os.makedirs(data_folder, exist_ok=True)
    graph_file_path = os.path.join(data_folder, "simplified_bengaluru.graphml")

    # Remove the download logic here, assume the file is managed at server startup
    if not os.path.exists(graph_file_path):
        logger.error("simplified_bengaluru.graphml is missing. Please ensure it is downloaded at server startup.")
        raise HTTPException(status_code=500, detail="Required map file is missing.")

    logger.info(f"Received route calculation request: {route_request}")
    source = (route_request.source_lat, route_request.source_lng)
    destination = (route_request.dest_lat, route_request.dest_lng)

    cache_key = generate_cache_key(source, destination)

    # Check if the route is already cached in memory
    if cache_key in route_cache:
        logger.info(f"In-memory cache hit for route: {source} -> {destination}")
        sleep(1)  # Simulate a delay for cache hit
        return route_cache[cache_key]  # Always returns {"results": [...]}

    # Check persistent file cache
    persistent_cache_result = load_route_from_persistent_cache(cache_key)
    if persistent_cache_result:
        # Store in memory cache for faster future access
        route_cache[cache_key] = persistent_cache_result
        logger.info(f"Persistent cache hit for route: {source} -> {destination}")
        sleep(1)  # Simulate a delay for cache hit
        return persistent_cache_result

    try:
        graph_file = "./data/simplified_bengaluru.graphml"
        G = load_graph_from_file(graph_file)

        subgraph = extract_subgraph(G, source, destination)

        # Snap source and destination to the nearest nodes in the subgraph
        start_node = snap_to_nearest_node(subgraph, source)
        end_node = snap_to_nearest_node(subgraph, destination)
        logger.info(f"Start node: {start_node}, End node: {end_node}")

        # Use the A* algorithm and Dijkstra's algorithm to calculate the shortest path
        astar_router = AmbulanceRouter(subgraph)
        dijkstra_router = DijkstraRouter(subgraph)

        astar_result = astar_router.find_route(start_node, end_node)
        dijkstra_result = dijkstra_router.find_route(start_node, end_node)

        def filter_result(res):
            return {
                "algorithm": res.get("algorithm"),
                "time": res.get("time"),
                "nodes": res.get("nodes"),
                "distance": res.get("distance"),
                "route": res.get("route"),
            }
        response = {"results": [filter_result(astar_result), filter_result(dijkstra_result)]}

        # Store the route in both memory and persistent cache
        route_cache[cache_key] = response
        save_route_to_persistent_cache(cache_key, response)
        logger.info(f"Route calculated and cached (memory + persistent) with key: {cache_key}")

        return response
    except Exception as e:
        logger.error(f"Error calculating route: {e}")
        raise HTTPException(status_code=500, detail="Failed to calculate route")

@router.get("/logs")
async def get_logs():
    """Endpoint to fetch server logs"""
    try:
        with open("server_logs.log", "r") as log_file:
            logs = log_file.readlines()
        return {"logs": logs}
    except Exception as e:
        logger.error(f"Error reading logs: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch logs")

@router.get("/routes/health")
async def health_check():
    """Endpoint for service health check"""
    logger.info("Health check endpoint was called.")
    return {"status": "healthy", "service": "ambulance-routing"}

@router.post("/proximity")
async def handle_proximity(request: Request):
    data = await request.json()
    try:
        # Access iot_manager from app state
        iot_manager = request.app.state.iot_manager
        iot_manager.handle_proximity(data)
        return {"status": "received", "data": data}
    except Exception as e:
        logger.error(f"Error handling proximity data: {e}")
        return {"status": "error", "message": str(e)}