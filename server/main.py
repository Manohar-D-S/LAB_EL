from contextlib import asynccontextmanager
from fastapi import FastAPI
import logging
from fastapi.middleware.cors import CORSMiddleware
from core.routing.graph_builder import build_simplified_graph
from api.routes import router  # Make sure this import exists
from fastapi.responses import JSONResponse

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

# Add a logs route to display server activity logs
@app.get("/logs")
def get_logs():
    """
    Endpoint to fetch and display server activity logs.
    """
    try:
        # Read the log file
        with open("server_logs.log", "r") as log_file:
            logs = log_file.readlines()
        
        # Return the logs as a JSON response
        return JSONResponse(content={"logs": logs})
    except FileNotFoundError:
        # Handle case where log file does not exist
        return JSONResponse(content={"error": "Log file not found."}, status_code=404)
    except Exception as e:
        # Handle other errors
        logger.error(f"Error reading logs: {e}")
        return JSONResponse(content={"error": "Failed to fetch logs."}, status_code=500)

app.include_router(router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)