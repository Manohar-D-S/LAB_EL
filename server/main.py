from contextlib import asynccontextmanager
from fastapi import FastAPI
from core.routing.graph_builder import build_simplified_graph
from api.routes import router

@asynccontextmanager
# In main.py, update the lifespan function:
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Use default Bengaluru coordinates for initialization
    DEFAULT_SOURCE = (12.9716, 77.5946)  # Bangalore coordinates
    DEFAULT_DEST = (12.9352, 77.6101)    # Nearby point
    build_simplified_graph(DEFAULT_SOURCE, DEFAULT_DEST)
    yield
    # Shutdown logic (optional)
    # pass

app = FastAPI(lifespan=lifespan)
app.include_router(router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)