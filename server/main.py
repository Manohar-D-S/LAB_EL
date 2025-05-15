from contextlib import asynccontextmanager
from fastapi import FastAPI
import logging
from core.routing.graph_builder import build_simplified_graph
from api.routes import router  # Make sure this import exists

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize with default Bengaluru coordinates
    DEFAULT_SOURCE = (12.9716, 77.5946)  # Bangalore coordinates
    DEFAULT_DEST = (12.9352, 77.6101)    # Nearby point
    
    try:
        logger.info("Initializing routing graph...")
        # Remove 'await' since build_simplified_graph is synchronous
        build_simplified_graph(DEFAULT_SOURCE, DEFAULT_DEST)
        logger.info("Routing graph initialized")
        yield
    except Exception as e:
        logger.error(f"Startup failed: {str(e)}")
        raise

app = FastAPI(lifespan=lifespan)
app.include_router(router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)