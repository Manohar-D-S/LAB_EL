from fastapi import APIRouter, HTTPException
from core.routing.graph_builder import fetch_osm_graph
from core.routing.a_star import EmergencyRouter
from utils.geo_helpers import snap_to_nearest_node
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/route")
async def calculate_route(start_lat: float, start_lng: float, 
                         end_lat: float, end_lng: float):
    try:
        G = fetch_osm_graph((start_lat, start_lng), (end_lat, end_lng))
        start_node = snap_to_nearest_node(G, (start_lat, start_lng))
        end_node = snap_to_nearest_node(G, (end_lat, end_lng))
        
        router = EmergencyRouter(G)
        path = router.bidirectional_astar(start_node, end_node)
        
        return {
            "path": path,
            "nodes": len(G.nodes),
            "edges": len(G.edges)
        }
    except Exception as e:
        logger.error(f"Routing failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))