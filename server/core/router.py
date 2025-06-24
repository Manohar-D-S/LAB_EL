import logging
import functools
from typing import Dict, Any, Tuple, List

from core.routing.a_star import AmbulanceRouter
from core.routing.dijkstra import DijkstraRouter
from core.graph_manager import get_graph_manager
from core.config import get_settings

logger = logging.getLogger(__name__)

# Cache router instances to avoid recreating them for each request
_ambulance_router = None
_dijkstra_router = None

def get_ambulance_router() -> AmbulanceRouter:
    """
    Get or create an instance of the AmbulanceRouter.
    Uses A* algorithm optimized for emergency vehicles.
    
    Returns:
        AmbulanceRouter: A router instance for emergency vehicle routing
    """
    global _ambulance_router
    
    if _ambulance_router is None:
        # Get the graph from the graph manager
        graph_manager = get_graph_manager()
        graph = graph_manager.get_graph()
        
        # Create a new router instance
        _ambulance_router = AmbulanceRouter(graph)
        logger.info(f"AmbulanceRouter initialized with graph containing {len(graph.nodes)} nodes and {len(graph.edges)} edges.")
    
    return _ambulance_router

def get_dijkstra_router() -> DijkstraRouter:
    """
    Get or create an instance of the DijkstraRouter.
    Uses Dijkstra's algorithm for comparison with A*.
    
    Returns:
        DijkstraRouter: A router instance using Dijkstra's algorithm
    """
    global _dijkstra_router
    
    if _dijkstra_router is None:
        # Get the graph from the graph manager
        graph_manager = get_graph_manager()
        graph = graph_manager.get_graph()
        
        # Create a new router instance
        _dijkstra_router = DijkstraRouter(graph)
        logger.info(f"DijkstraRouter initialized with graph containing {len(graph.nodes)} nodes and {len(graph.edges)} edges.")
    
    return _dijkstra_router

def reset_routers():
    """
    Reset the router instances.
    This is useful when the graph is updated and the routers need to be recreated.
    """
    global _ambulance_router, _dijkstra_router
    _ambulance_router = None
    _dijkstra_router = None
    logger.info("Router instances have been reset")
