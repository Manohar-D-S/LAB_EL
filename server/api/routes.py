from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import JSONResponse
from typing import Dict, Any
import logging

from core.routing.graph_builder import build_simplified_graph
from core.routing.a_star import AmbulanceRouter
from core.metrics import calculate_route_metrics
from api.schemas import RouteRequest, RouteResponse
from utils.geo_helpers import snap_to_nearest_node

# router = APIRouter(prefix="/api/v1", tags=["Routing"])
router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/router-test")
def router_test():
    return {"message": "Router test route works!"}

@router.get("/routes")
async def get_routes():
    """Get a list of predefined routes"""
    # Return a list of sample routes for demonstration
    return [
        {
            "id": "1",
            "name": "Emergency Route 1",
            "description": "Koramangala to Indiranagar",
            "createdAt": "2025-05-15T08:00:00Z",
            "startPoint": {"lat": 12.9716, "lng": 77.5946},
            "endPoint": {"lat": 12.9352, "lng": 77.6101},
            "waypoints": [],  # Empty waypoints array
            "status": "pending",  # Add status field
            "distance": 5.2,
            "duration": 12 * 60  # Convert to seconds as expected by frontend
        },
        {
            "id": "2",
            "name": "Emergency Route 2",
            "description": "Whitefield to Electronic City",
            "createdAt": "2025-05-15T09:00:00Z",
            "startPoint": {"lat": 12.9698, "lng": 77.7499},
            "endPoint": {"lat": 12.8399, "lng": 77.6770},
            "waypoints": [],  # Empty waypoints array
            "status": "pending",  # Add status field
            "distance": 15.7,
            "duration": 35 * 60  # Convert to seconds as expected by frontend
        }
    ]

# @router.post("/routes", response_model=RouteResponse)
@router.post("/routes")
async def calculate_route(route_request: RouteRequest) -> Dict[str, Any]:
    """
    Calculate optimal ambulance route between two points.
    
    Args:
        start_lat: Starting latitude
        start_lng: Starting longitude
        end_lat: Destination latitude
        end_lng: Destination longitude
    
    Returns:
        Dictionary containing:
        - path: List of node IDs in the route
        - distance_km: Total route distance in kilometers
        - time_mins: Estimated travel time in minutes
        - visualization_url: URL to route visualization (if generated)
    """
    try:
        # Extract coordinates
        source = (route_request.source_lat, route_request.source_lng)
        dest = (route_request.dest_lat, route_request.dest_lng)
        
        # Build optimized graph
        G = build_simplified_graph(source, dest)
        
        # Find nearest nodes
        start_node = snap_to_nearest_node(G, source)
        end_node = snap_to_nearest_node(G, dest)
        
        # Calculate route
        router = AmbulanceRouter(G)
        route_result = router.find_route(start_node, end_node)
        
        if not route_result:
            raise HTTPException(
                status_code=404,
                detail="No valid route found between the specified points"
            )
        
        # Calculate additional metrics
        metrics = calculate_route_metrics(G, route_result['path'])
        
        # Prepare response
        response = RouteResponse(
            path=route_result['nodes'],  # List of (lat, lng) tuples
            distance=metrics['distance_km'],
            duration=metrics['time_mins'],
            road_types=metrics.get('road_types', {}),
            visualization_url=f"/api/v1/visualizations/{source}_{dest}.png"
        )
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Route calculation failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to calculate route. Please try again later."
        )

@router.get("/routes/health")
async def health_check() -> Dict[str, str]:
    """Endpoint for service health check"""
    return {"status": "healthy", "service": "ambulance-routing"}