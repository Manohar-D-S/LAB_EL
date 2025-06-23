import os
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

from core.routing.graph_builder import build_simplified_graph, load_graph_from_file, extract_subgraph
from core.routing.a_star import AmbulanceRouter
from utils.geo_helpers import snap_to_nearest_node
from api.schemas import RouteRequest

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

def generate_cache_key(source: Tuple[float, float], destination: Tuple[float, float]) -> str:
    """Generate a unique cache key based on source and destination coordinates."""
    key = f"{source[0]}-{source[1]}-{destination[0]}-{destination[1]}"
    return sha256(key.encode()).hexdigest()

@router.get("/router-test")
def router_test():
    logger.info("Router test endpoint was called.")
    return {"message": "Router test route works!"}

@router.get("/routes")
async def get_routes():
    logger.info("Fetching routes. No predefined routes will be returned.")
    return {"routes": []}  # Return an empty list or remove this endpoint entirely

@router.post("/routes")
async def calculate_route(route_request: RouteRequest):
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

    # Generate a cache key for the route
    cache_key = generate_cache_key(source, destination)

    # Check if the route is already cached
    if cache_key in route_cache:
        logger.info(f"Checking for cached route with key: {cache_key}")
        sleep(1)  # Simulate a delay for cache hit
        logger.info(f"Cache hit for route: {source} -> {destination}")
        return route_cache[cache_key]

    try:
        # Load the full graph from the local file
        graph_file = "./data/simplified_bengaluru.graphml"
        G = load_graph_from_file(graph_file)

        # Extract the subgraph for the bounding box
        subgraph = extract_subgraph(G, source, destination)

        # Snap source and destination to the nearest nodes in the subgraph
        start_node = snap_to_nearest_node(subgraph, source)
        end_node = snap_to_nearest_node(subgraph, destination)
        logger.info(f"Start node: {start_node}, End node: {end_node}")

        # Use the A* algorithm to calculate the shortest path
        router = AmbulanceRouter(subgraph)
        path = router.astar(start_node, end_node)
        logger.info(f"Calculated path: {path}")

        # Calculate the distance of the route
        try:
            # Try to use geopy for more accurate distance calculation
            from geopy.distance import geodesic
            distance = sum(
                geodesic(
                    (subgraph.nodes[path[i]]["y"], subgraph.nodes[path[i]]["x"]),
                    (subgraph.nodes[path[i + 1]]["y"], subgraph.nodes[path[i + 1]]["x"])
                ).kilometers
                for i in range(len(path) - 1)
            )
        except Exception:
            # Fall back to euclidean distance if geopy fails
            distance = sum(
                ox.distance.great_circle(
                    subgraph.nodes[path[i]]["y"], subgraph.nodes[path[i]]["x"],
                    subgraph.nodes[path[i + 1]]["y"], subgraph.nodes[path[i + 1]]["x"]
                ) / 1000  # Convert meters to kilometers
                for i in range(len(path) - 1)
            )

        # Calculate estimated travel time (assuming average speed of 30 km/h)
        time_mins = distance / 30 * 60  # Time in minutes

        # Format response
        route_coordinates = [(subgraph.nodes[node]["y"], subgraph.nodes[node]["x"]) for node in path]
        
        response = {
            "route_coordinates": route_coordinates,
            "distance_km": distance,
            "time_mins": time_mins,
            "algorithm_comparison": [
                {
                    "algorithm": "A* Algorithm",
                    "computation_time": 0,  # Not measuring computation time
                    "distance_km": distance,
                    "nodes_count": len(path)
                }
            ]
        }

        # Store the route in the cache
        route_cache[cache_key] = response
        logger.info(f"Route calculated and cached with key: {cache_key}")

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