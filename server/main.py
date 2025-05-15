from contextlib import asynccontextmanager
from fastapi import FastAPI
import logging
from fastapi.middleware.cors import CORSMiddleware
from core.routing.graph_builder import build_simplified_graph
from api.routes import router  # Make sure this import exists

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize with default Bengaluru coordinates
    DEFAULT_SOURCE = (12.9716, 77.5946)  # Bangalore coordinates
    DEFAULT_DEST = (12.9352, 77.6101)    # Nearby point
    
    try:
        # Skip graph preloading for now
        logger.info("Skipping graph preloading for faster startup...")
        yield {}
    except Exception as e:
        logger.error(f"Error during startup: {e}")
        yield {}

app = FastAPI(lifespan=lifespan)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],  # Frontend URLs
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods
    allow_headers=["*"],  # Allow all headers
)

# Add a test route directly to the app
@app.get("/test")
def test_route():
    return {"message": "Test route works!"}

# Add a test POST route
@app.post("/test-post")
def test_post_route(data: dict):
    return {"received": data, "message": "Post route works!"}

# Add a root route
@app.get("/")
def root():
    return {"message": "Welcome to the Ambulance Routing API"}

app.include_router(router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)