from contextlib import asynccontextmanager
from fastapi import FastAPI
from core.routing.graph_builder import build_simplified_graph
from api.routes import router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup logic
    build_simplified_graph()
    yield
    # Shutdown logic (optional)
    # pass

app = FastAPI(lifespan=lifespan)
app.include_router(router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)