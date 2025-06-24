from pydantic import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    # API settings
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Emergency Vehicle Routing"
    
    # Routing settings
    USE_EDGE_BASED_ROUTING: bool = False  # Disabled edge-based routing as requested
    USE_NODE_BASED_ROUTING: bool = True   # Enable node-based routing
    
    # Graph settings
    GRAPH_FILE: str = "data/graph.pkl"
    
    # Algorithm settings
    DIJKSTRA_WEIGHT_FACTOR: float = 1.0
    ASTAR_WEIGHT_FACTOR: float = 1.0
    
    # Performance settings
    ENABLE_PERFORMANCE_LOGGING: bool = True
    
    class Config:
        env_file = ".env"
        case_sensitive = True

@lru_cache()
def get_settings():
    return Settings()
