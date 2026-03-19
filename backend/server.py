"""FastAPI server with AG-UI + LangGraph integration."""
import os
import sys
import logging
import warnings

# Add project root to path so examples can be imported
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Data-first: enable logging for message flow
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Suppress Pydantic warnings from third-party libraries about unsupported Field attributes
warnings.filterwarnings("ignore", category=Warning, module="pydantic.*", message=".*UnsupportedFieldAttributeWarning.*")

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from copilotkit import LangGraphAGUIAgent
from ag_ui_langgraph import add_langgraph_fastapi_endpoint

from agent.graph import graph

app = FastAPI(title="Widget Platform Orchestrator", version="0.2.0")

# Log all requests to copilotkit endpoint
@app.middleware("http")
async def log_requests(request: Request, call_next):
    if "/copilotkit" in request.url.path:
        logger.info(f"Incoming request to {request.url.path}")
        body = await request.body()
        logger.debug(f"Request body: {body[:500] if len(body) > 500 else body}")
    response = await call_next(request)
    logger.info(f"Response status: {response.status_code}")
    return response

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:3000")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

add_langgraph_fastapi_endpoint(
    app=app,
    agent=LangGraphAGUIAgent(
        name="orchestrator",
        description="Widget platform orchestrator agent",
        graph=graph,
    ),
    path="/copilotkit",
)


@app.get("/health")
async def health():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
