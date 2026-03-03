# Docker Deployment Guide

## Quick Start

### Local Development with Docker

```bash
# Build and start both services
docker-compose up --build

# Or run in detached mode
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Deploy to Remote Server

```bash
# Set up Docker context for remote server
docker context create remote --docker "host=ssh://user@your-server.com"
docker context use remote

# Deploy to remote server
docker-compose up -d --build

# Switch back to local
docker context use default
```

## Environment Variables

Create a `.env` file in the project root:

```env
GOOGLE_API_KEY=your_google_api_key_here
LANGSMITH_API_KEY=your_langsmith_key_here  # Optional
```

## Services

- **Frontend**: Next.js app on port 3000
- **Backend**: FastAPI + LangGraph on port 8123

## Health Checks

The backend includes a health check endpoint at `/health`. The frontend waits for the backend to be healthy before starting.

## Troubleshooting

```bash
# Check service status
docker-compose ps

# View backend logs
docker-compose logs backend

# View frontend logs
docker-compose logs frontend

# Restart a specific service
docker-compose restart backend

# Rebuild without cache
docker-compose build --no-cache
```
