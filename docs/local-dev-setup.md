# Local Development Setup

This guide shows you how to run the frontend and backend locally while connecting to production services (database, auth, Letta).

## Quick Start

1. **Copy the local dev environment file:**
   ```bash
   cp .env.local.dev .env.local
   ```

2. **Start the development servers:**
   ```bash
   ./startup.sh
   ```

3. **Access the app:**
   - Frontend: http://localhost:3000
   - Backend: http://localhost:8123

## What This Does

- ✅ Runs Next.js frontend locally (port 3000)
- ✅ Runs FastAPI backend locally (port 8123)
- ✅ Connects to production Supabase at `66.42.117.148:8000`
- ✅ Connects to production Letta at `66.42.117.148:8283`
- ✅ All data syncs with production automatically

## Demo Users

Use these credentials to test the app:

**Student Account:**
- Email: `demo-student@omniscience.app`
- Password: `demo123`

**Teacher Account:**
- Email: `demo-teacher@omniscience.app`
- Password: `demo123`

Or click the quick-fill buttons on the login page!

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Local Machine                                               │
│                                                             │
│  ┌──────────────┐         ┌──────────────┐                │
│  │   Next.js    │────────▶│   FastAPI    │                │
│  │  (port 3000) │         │  (port 8123) │                │
│  └──────────────┘         └──────┬───────┘                │
│         │                         │                         │
└─────────┼─────────────────────────┼─────────────────────────┘
          │                         │
          │                         │
          ▼                         ▼
┌─────────────────────────────────────────────────────────────┐
│ Production Server (66.42.117.148)                           │
│                                                             │
│  ┌──────────────┐         ┌──────────────┐                │
│  │   Supabase   │         │    Letta     │                │
│  │  (port 8000) │         │  (port 8283) │                │
│  └──────────────┘         └──────────────┘                │
│         │                                                   │
│         ▼                                                   │
│  ┌──────────────┐                                          │
│  │  PostgreSQL  │                                          │
│  │  (port 5432) │                                          │
│  └──────────────┘                                          │
└─────────────────────────────────────────────────────────────┘
```

## Benefits

✅ **Fast iteration** - Hot reload for frontend and backend
✅ **Real data** - Work with actual production data
✅ **No local infrastructure** - No need to run Docker locally
✅ **Data sync** - Changes reflect immediately in production
✅ **Easy debugging** - Full access to logs and dev tools

## Warnings

⚠️ **You're working with production data!**
- Be careful with destructive operations
- Test users are prefixed with `test-` or `demo-`
- Don't delete real user data

⚠️ **Network dependency**
- Requires internet connection
- Latency depends on network speed
- Can't work offline

## Switching Back to Full Docker

To run everything in Docker (including DB):

```bash
# Stop local dev servers
./shutdown.sh

# Use production env
cp .env .env.local

# Start all services
docker compose up -d
```

## Troubleshooting

**Backend can't connect to Supabase:**
- Check if production server is running: `curl http://66.42.117.148:8000/health`
- Verify `.env.local` has correct URLs

**Frontend can't reach backend:**
- Check backend is running: `curl http://localhost:8123/health`
- Check logs: `tail -f .logs/backend.log`

**Auth errors:**
- Verify JWT_SECRET matches production
- Check Supabase keys are correct
