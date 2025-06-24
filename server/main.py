#main.py
# This is the main entry point for the FastAPI application.

from fastapi import FastAPI, Depends, HTTPException
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from core.routing.graph_builder import build_simplified_graph
from api.routes import router as api_router
from iot.routes import router as iot_router
import logging
import os
import requests
import uvicorn

# IoT modules
from iot.iot_manager import IOTManager
from iot.esp32_communicator import ESP32Communicator
from iot.signal_processor import SignalProcessor

    
load_dotenv()  # Load environment variables from .env file

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app with lifespan context manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle application startup and shutdown events."""
    # Startup logic
    try:
        # Ensure data directory exists
        data_folder = "./data"
        os.makedirs(data_folder, exist_ok=True)
        graph_file_path = os.path.join(data_folder, "simplified_bengaluru.graphml")

        # Download OSM data if not exists
        if not os.path.exists(graph_file_path):
            logger.info("Downloading map data from OSM Overpass API...")
            overpass_url = "https://overpass-api.de/api/interpreter "
            
            overpass_query = """
                [out:xml][timeout:25];
                (
                  way["highway","road"](12.834,77.461,13.139,77.739);
                );
                out body;
                >;
                out skel qt;
            """.strip()
            
            response = requests.post(
                overpass_url, 
                data=overpass_query,
                headers={"Content-Type": "text/plain"}
            )
            response.raise_for_status()

            if len(response.content) < 100:
                raise RuntimeError("Received invalid or empty response from Overpass API.")

            # Save raw OSM data
            temp_osm_path = os.path.join(data_folder, "bengaluru.osm")
            with open(temp_osm_path, "wb") as osm_file:
                osm_file.write(response.content)
            logger.info("Downloaded bengaluru.osm successfully.")
        else:
            logger.info("Graph file already exists. Skipping download.")

        # Initialize ESP32 communicator with signal-to-ESP32 mapping
        # esp32_ip_map = {
        #     "SIG-001": os.getenv("ESP32_SIG001_IP", "192.168.1.100"),
        #     "SIG-002": os.getenv("ESP32_SIG002_IP", "192.168.1.101")
        # }
        
        # # Initialize IoT components
        # signal_processor = SignalProcessor(graph)
        # esp32_communicator = ESP32Communicator(esp32_ip_map)
        # iot_manager = IOTManager(signal_processor, esp32_communicator)
        
        # # Store in app state
        # app.state.graph = graph
        # app.state.iot_manager = iot_manager
        
        logger.info("Startup complete")
        yield {"status": "ready"}
        
    except Exception as e:
        logger.error(f"Startup failed: {str(e)}", exc_info=True)
        raise
    
    finally:
        # Shutdown logic
        logger.info("Shutting down application")

# Create FastAPI instance
app = FastAPI(lifespan=lifespan)


app.include_router(iot_router)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root route
@app.get("/")
def root():
    return {"message": "Welcome to the Smart Ambulance Routing System", "version": "2.0"}

# Test routes
@app.get("/test")
def test_route():
    return {"message": "Test route works!", "status": "success"}

@app.post("/test-post")
def test_post_route(data: dict):
    return {"received": data, "message": "Post route works!"}

# Logs route
@app.get("/logs")
def get_logs():
    try:
        with open("server_logs.log", "r") as log_file:
            logs = log_file.readlines()
        return JSONResponse(content={"logs": logs})
    except FileNotFoundError:
        return JSONResponse(content={"error": "Log file not found."}, status_code=404)
    except Exception as e:
        logger.error(f"Error reading logs: {e}")
        return JSONResponse(content={"error": "Failed to fetch logs."}, status_code=500)

# Include routers
app.include_router(api_router)
app.include_router(
    router=api_router,
    prefix="/api",
    tags=["api"]
)

# Include IoT routes from iot/routes.py
@app.get("/iot/status")
def iot_status():
    return {"status": "active", "components": ["signal_processor", "esp32_communicator"]}

# Main entrypoint
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

# from contextlib import asynccontextmanager
# from fastapi import FastAPI
# import logging
# import os
# import requests
# from fastapi.middleware.cors import CORSMiddleware
# from core.routing.graph_builder import build_simplified_graph
# from api.routes import router  # Make sure this import exists
# from fastapi.responses import JSONResponse

# logger = logging.getLogger(__name__)

# @asynccontextmanager
# async def lifespan(app: FastAPI):
#     data_folder = "./data"
#     os.makedirs(data_folder, exist_ok=True)
#     graph_file_path = os.path.join(data_folder, "simplified_bengaluru.graphml")

#     if not os.path.exists(graph_file_path):
#         try:
#             print("Downloading map data from OSM Overpass API...\n")
#             overpass_url = "https://overpass-api.de/api/interpreter "
#             overpass_query = """
#                 [out:xml][timeout:25];
#                 (
#                   way["highway"](12.834,77.461,13.139,77.739);
#                 );
#                 out body;
#                 >;
#                 out skel qt;
#             """
#             overpass_query = overpass_query.strip()  # Remove leading/trailing whitespace

#             response = requests.post(overpass_url, data=overpass_query, headers={"Content-Type": "text/plain"})
#             response.raise_for_status()

#             if len(response.content) < 100:
#                 raise RuntimeError("Received invalid or empty response from Overpass API.")

#             # Save as .osm first; later process into GraphML if needed
#             temp_osm_path = os.path.join(data_folder, "bengaluru.osm")
#             with open(temp_osm_path, "wb") as osm_file:
#                 osm_file.write(response.content)
#             print("Downloaded bengaluru.osm successfully.")

#             # Optional: Convert .osm to .graphml here using networkx/osmnx if needed
#             # For example:
#             # import osmnx as ox
#             # G = ox.graph_from_xml(temp_osm_path)
#             # ox.save_graphml(G, filepath=graph_file_path)

#         except requests.RequestException as e:
#             print(f"Failed to download map data: {e}")
#             raise RuntimeError("Failed to download required map file.")
#     else:
#         print("simplified_bengaluru.graphml already exists. Skipping download.")

#     yield {}

# app = FastAPI(lifespan=lifespan)

# # Configure CORS
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],  # Frontend URLs
#     allow_credentials=True,
#     allow_methods=["*"],  # Allow all methods
#     allow_headers=["*"],  # Allow all headers
# )

# # Add a test route directly to the app
# @app.get("/test")
# def test_route():
#     return {"message": "Test route works!"}

# # Add a test POST route
# @app.post("/test-post")
# def test_post_route(data: dict):
#     return {"received": data, "message": "Post route works!"}

# # Add a root route
# @app.get("/")
# def root():
#     return {"message": "Welcome to the Ambulance Routing API"}

# # Add a logs route to display server activity logs
# @app.get("/logs")
# def get_logs():
#     """
#     Endpoint to fetch and display server activity logs.
#     """
#     try:
#         # Read the log file
#         with open("server_logs.log", "r") as log_file:
#             logs = log_file.readlines()
        
#         # Return the logs as a JSON response
#         return JSONResponse(content={"logs": logs})
#     except FileNotFoundError:
#         # Handle case where log file does not exist
#         return JSONResponse(content={"error": "Log file not found."}, status_code=404)
#     except Exception as e:
#         # Handle other errors
#         logger.error(f"Error reading logs: {e}")
#         return JSONResponse(content={"error": "Failed to fetch logs."}, status_code=500)

# app.include_router(router)

# if __name__ == "__main__":
#     import uvicorn
#     uvicorn.run(app, host="0.0.0.0", port=8000)



