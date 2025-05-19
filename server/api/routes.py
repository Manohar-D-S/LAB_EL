import os
import logging
import requests
from fastapi import APIRouter, HTTPException, Depends, Request, FastAPI
from fastapi.responses import JSONResponse
from typing import Dict, Any, Tuple
from hashlib import sha256
import matplotlib.pyplot as plt
import osmnx as ox
from datetime import datetime
from time import sleep

from core.routing.graph_builder import build_simplified_graph, load_graph_from_file, extract_subgraph
from core.routing.a_star import AmbulanceRouter
from utils.geo_helpers import snap_to_nearest_node
from api.schemas import RouteRequest
from iot.iot_manager import IOTManager

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

# def save_route_image(G, path, filename: str):
#     """Generate and save an image of the route."""
#     try:
#         # Plot the route on the graph
#         fig, ax = ox.plot_graph_route(
#             G,
#             path,
#             route_linewidth=6,
#             route_color="blue",
#             node_size=0,
#             bgcolor="white",
#             show=False,
#             close=False
#         )
#         # Save the image to the specified filename
#         filepath = os.path.join("./server", filename)
#         plt.savefig(filepath, dpi=300, bbox_inches="tight")
#         plt.close(fig)
#         logger.info(f"Route image saved at {filepath}")
#     except Exception as e:
#         logger.error(f"Failed to save route image: {e}")

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
        logger.error("bangalore_map.graphml is missing. Please ensure it is downloaded at server startup.")
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
        distance = sum(
            ox.distance.euclidean_dist_vec(
                subgraph.nodes[path[i]]["y"], subgraph.nodes[path[i]]["x"],
                subgraph.nodes[path[i + 1]]["y"], subgraph.nodes[path[i + 1]]["x"]
            )
            for i in range(len(path) - 1)
        )


        response = {
            "path": [{"lat": subgraph.nodes[node]["y"], "lng": subgraph.nodes[node]["x"]} for node in path],
            "startPoint": {"lat": source[0], "lng": source[1]},
            "endPoint": {"lat": destination[0], "lng": destination[1]},
            "distance": distance,  # Include the distance in the response
        }

        # Store the route in the cache
        route_cache[cache_key] = response
        logger.info(f"Route cached with key: {cache_key}")

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
    # Access iot_manager from app state
    iot_manager = request.app.state.iot_manager
    iot_manager.handle_proximity(data)
    return {"status": "received", "data": data}