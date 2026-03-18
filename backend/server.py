"""FastAPI server with CopilotKit SDK integration."""
import os
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from copilotkit import CopilotKitRemoteEndpoint, LangGraphAGUIAgent
from copilotkit.integrations.fastapi import add_fastapi_endpoint

from agent.graph import graph

app = FastAPI(title="CopilotKit + LangGraph Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:3000")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

sdk = CopilotKitRemoteEndpoint(
    agents=[
        LangGraphAGUIAgent(
            name="agent",
            description="General-purpose assistant agent",
            graph=graph,
        )
    ]
)

add_fastapi_endpoint(app, sdk, "/copilotkit")


@app.get("/health")
async def health():
    return {"status": "healthy"}
