from contextlib import asynccontextmanager
from fastapi import FastAPI
import logging
import os
import requests
from fastapi.middleware.cors import CORSMiddleware
from core.routing.graph_builder import build_simplified_graph
from api.routes import router  # Make sure this import exists
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure the bangalore_map.graphml file exists on server startup
    data_folder = "./data"
    os.makedirs(data_folder, exist_ok=True)
    graph_file_path = os.path.join(data_folder, "bangalore_map.graphml")

    if not os.path.exists(graph_file_path):
        try:
            # Use OSM Overpass API to fetch the map data
            print("Downloading bangalore_map.graphml from OSM Overpass API...\n")
            overpass_url = "https://overpass-api.de/api/interpreter"
            overpass_query = """
                [out:xml];
                (
                  node(12.834,77.461,13.139,77.739);
                  way(12.834,77.461,13.139,77.739);
                  relation(12.834,77.461,13.139,77.739);
                );
                out meta;
                >;
                out meta qt;
            """
            response = requests.post(overpass_url, data=overpass_query, headers={"Content-Type": "text/plain"})
            response.raise_for_status()

            # Save the response as a .graphml file
            with open(graph_file_path, "wb") as graph_file:
                graph_file.write(response.content)
            print("Downloaded bangalore_map.graphml successfully.")
        except requests.RequestException as e:
            print(f"Failed to download bangalore_map.graphml: {e}")
            raise RuntimeError("Failed to download required map file.")
    else:
        print("bangalore_map.graphml already exists. Skipping download.")

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