"""FastAPI server with CopilotKit integration."""
import json
import logging
from datetime import datetime
from typing import Any, Dict

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from agent.graph import graph


# Configure structured logging
class StructuredLogger:
    """Modal-style structured JSON logger."""

    def __init__(self, name: str):
        self.name = name
        self.logger = logging.getLogger(name)
        self.logger.setLevel(logging.INFO)

        # Remove default handlers
        self.logger.handlers = []

        # Add console handler with JSON formatter
        handler = logging.StreamHandler()
        handler.setLevel(logging.INFO)
        self.logger.addHandler(handler)

    def _log(self, level: str, message: str, **kwargs):
        """Log structured JSON message."""
        log_entry = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": level,
            "message": message,
            "service": self.name,
            **kwargs
        }
        print(json.dumps(log_entry))

    def info(self, message: str, **kwargs):
        self._log("INFO", message, **kwargs)

    def error(self, message: str, **kwargs):
        self._log("ERROR", message, **kwargs)

    def warning(self, message: str, **kwargs):
        self._log("WARNING", message, **kwargs)


logger = StructuredLogger("copilot-backend")

# Create FastAPI app
app = FastAPI(
    title="CopilotKit + LangGraph Backend",
    description="Backend server for CopilotKit with LangGraph agent",
    version="0.1.0"
)

# Configure CORS for localhost:3000
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check() -> Dict[str, Any]:
    """Health check endpoint."""
    logger.info("Health check requested")
    return {
        "status": "healthy",
        "service": "copilot-backend",
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


@app.post("/copilotkit")
async def copilotkit_endpoint(request: Dict[str, Any]) -> JSONResponse:
    """
    CopilotKit runtime endpoint.

    Processes requests from CopilotKit frontend and executes the LangGraph agent.
    """
    logger.info("CopilotKit request received", request_keys=list(request.keys()))

    try:
        # Extract task from request
        task = request.get("task", "")
        messages = request.get("messages", [])

        # Execute the graph
        result = graph.invoke({
            "messages": messages,
            "current_task": task,
            "result": ""
        })

        logger.info("Graph execution completed", result_length=len(str(result)))

        return JSONResponse(content={
            "status": "success",
            "result": result.get("result", ""),
            "state": result
        })

    except Exception as e:
        logger.error("Graph execution failed", error=str(e), error_type=type(e).__name__)
        return JSONResponse(
            status_code=500,
            content={
                "status": "error",
                "error": str(e)
            }
        )


@app.on_event("startup")
async def startup_event():
    """Log startup event."""
    logger.info("Server starting", port=8123)


@app.on_event("shutdown")
async def shutdown_event():
    """Log shutdown event."""
    logger.info("Server shutting down")


if __name__ == "__main__":
    import uvicorn
    logger.info("Starting uvicorn server", host="0.0.0.0", port=8123)
    uvicorn.run(app, host="0.0.0.0", port=8123)
