import osmnx as ox
from geopy.distance import great_circle
import logging
import networkx as nx
import numpy as np
import os
import time
from functools import wraps

# Lighter GPU dependencies
try:
    import cupy as cp
    from numba import cuda
    CUDA_AVAILABLE = True
except ImportError:
    CUDA_AVAILABLE = False

logger = logging.getLogger(__name__)

VEHICLE_FILTER = (
    '["highway"]["motor_vehicle"!~"no"]["motorcar"!~"no"]'
    '["access"!~"private"]["service"!~"parking|driveway"]'
    '["highway"!~"cycleway|footway|path|pedestrian|steps|track|corridor|bus_guideway|escape"]'
)

def check_cuda_availability():
    """Check if CUDA is available and return GPU information."""
    if not CUDA_AVAILABLE:
        logger.info("CUDA libraries not installed, using CPU processing")
        return False, "CUDA libraries not installed"
    
    try:
        # Check if CUDA-capable GPU is available
        if not cuda.is_available(): # type: ignore
            logger.info("No CUDA-capable GPUs found, using CPU processing")
            return False, "No CUDA-capable GPUs found"
        
        # Get GPU information
        device = cuda.get_current_device()# type: ignore
        gpu_info = f"Using GPU: {device.name} with {device.compute_capability[0]}.{device.compute_capability[1]} capability"
        logger.info(f"CUDA available: {gpu_info}")
        return True, gpu_info
    except Exception as e:
        logger.warning(f"Error checking CUDA availability: {str(e)}. Falling back to CPU processing.")
        return False, f"Error: {str(e)}"

# Initialize CUDA status at module load time
CUDA_ENABLED, GPU_INFO = check_cuda_availability()

def cuda_timer(func):
    """Decorator to time functions and log GPU vs CPU performance"""
    @wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.time()
        result = func(*args, **kwargs)
        elapsed = time.time() - start_time
        
        # Log the time taken with CPU or GPU info
        if 'cuda' in func.__name__ and CUDA_ENABLED:
            logger.info(f"{func.__name__} completed in {elapsed:.4f}s using GPU acceleration")
        else:
            logger.info(f"{func.__name__} completed in {elapsed:.4f}s using CPU")
            
        return result
    return wrapper

def load_graph_from_file(graph_file: str) -> nx.MultiDiGraph:
    """Load the graph from a local file."""
    try:
        logger.info(f"Loading graph from file: {graph_file}")
        G = ox.load_graphml(graph_file)
        logger.info(f"Graph loaded with {len(G.nodes)} nodes and {len(G.edges)} edges.")
        return G
    except Exception as e:
        logger.error(f"Failed to load graph from file: {e}")
        raise

@cuda_timer
def extract_subgraph_cuda(G: nx.MultiDiGraph, source: tuple, dest: tuple) -> nx.MultiDiGraph:
    """Extract a subgraph using GPU acceleration with CuPy."""
    try:
        logger.info(f"Extracting subgraph with CUDA for source={source}, dest={dest}")
        
        # Calculate bounding box
        north = max(source[0], dest[0]) + 0.02
        south = min(source[0], dest[0]) - 0.02
        east = max(source[1], dest[1]) + 0.02
        west = min(source[1], dest[1]) - 0.02
        
        # Extract node coordinates using NumPy for CPU preprocessing
        node_ids = []
        coords = []
        
        for node, data in G.nodes(data=True):
            node_ids.append(node)
            y_coord = data.get('y', data.get('lat', 0))
            x_coord = data.get('x', data.get('lon', 0))
            coords.append((y_coord, x_coord))
        
        # Convert to CuPy arrays for GPU processing
        coords_array = np.array(coords, dtype=np.float32)
        coords_gpu = cp.asarray(coords_array) # type: ignore
        
        # Create mask for nodes within bbox using GPU
        lat_mask = (coords_gpu[:, 0] >= south) & (coords_gpu[:, 0] <= north)
        lng_mask = (coords_gpu[:, 1] >= west) & (coords_gpu[:, 1] <= east)
        mask = lat_mask & lng_mask
        
        # Get indices of nodes within bbox
        indices = cp.where(mask)[0].get() # type: ignore
        
        # Filter nodes
        nodes_within_bbox = [node_ids[i] for i in indices]
        
        # Create subgraph
        subgraph = G.subgraph(nodes_within_bbox).copy()
        logger.info(f"Subgraph extracted with {len(subgraph.nodes)} nodes and {len(subgraph.edges)} edges using CUDA.")
        return subgraph
    except Exception as e:
        logger.error(f"GPU subgraph extraction failed: {str(e)}")
        logger.info("Falling back to CPU implementation")
        return extract_subgraph(G, source, dest)

@cuda_timer
def extract_subgraph(G: nx.MultiDiGraph, source: tuple, dest: tuple) -> nx.MultiDiGraph:
    """Extract a subgraph (CPU implementation)."""
    try:
        logger.info(f"Extracting subgraph for source={source}, dest={dest}")
        north = max(source[0], dest[0]) + 0.02
        south = min(source[0], dest[0]) - 0.02
        east = max(source[1], dest[1]) + 0.02
        west = min(source[1], dest[1]) - 0.02

        nodes_within_bbox = [
            node for node, data in G.nodes(data=True)
            if (south <= data.get('y', data.get('lat', 0)) <= north) and 
               (west <= data.get('x', data.get('lon', 0)) <= east)
        ]
        subgraph = G.subgraph(nodes_within_bbox).copy()
        logger.info(f"Subgraph extracted with {len(subgraph.nodes)} nodes and {len(subgraph.edges)} edges.")
        return subgraph
    except Exception as e:
        logger.error(f"Failed to extract subgraph: {e}")
        raise

# For performance comparison, add GPU-accelerated version of path finding
if CUDA_AVAILABLE:
    @cuda.jit   # type: ignore
    def compute_distances_kernel(start_node_idx, distances, adjacency_matrix, visited):
        """CUDA kernel for computing shortest paths."""
        idx = cuda.grid(1) # type: ignore
        if idx < distances.shape[0] and not visited[idx]:
            if adjacency_matrix[start_node_idx, idx] > 0:
                new_dist = distances[start_node_idx] + adjacency_matrix[start_node_idx, idx]
                if new_dist < distances[idx]:
                    distances[idx] = new_dist

def build_simplified_graph(source: tuple, dest: tuple) -> nx.Graph:
    """Graph builder function"""
    try:
        logger.info(f"Building graph for source={source}, dest={dest}")
        north = max(source[0], dest[0]) + 0.02
        south = min(source[0], dest[0]) - 0.02
        east = max(source[1], dest[1]) + 0.02
        west = min(source[1], dest[1]) - 0.02
        
        G = ox.graph_from_bbox(
            (north, south, east, west),
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

def extract_route_subgraph(G: nx.MultiDiGraph, source: tuple, dest: tuple, use_gpu: bool = True) -> nx.MultiDiGraph:
    """Extract a subgraph with automatic GPU/CPU selection."""
    if use_gpu and CUDA_ENABLED:
        logger.info(f"Using GPU acceleration for subgraph extraction: {GPU_INFO}")
        try:
            return extract_subgraph_cuda(G, source, dest)
        except Exception as e:
            logger.warning(f"GPU subgraph extraction failed: {e}. Falling back to CPU.")
            return extract_subgraph(G, source, dest)
    else:
        reason = "User disabled GPU" if not use_gpu else "GPU not available"
        logger.info(f"Using CPU for subgraph extraction: {reason}")
        return extract_subgraph(G, source, dest)

