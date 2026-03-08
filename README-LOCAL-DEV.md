# 🚀 Local Development Guide

Run frontend + backend locally while connecting to production services for seamless development with real data.

## Quick Start

```bash
# 1. Copy local dev environment
cp .env.local.dev .env.local

# 2. Start development servers
./startup.sh

# 3. Open browser
open http://localhost:3000
```

## Demo Credentials

Click the quick-fill buttons on the login page, or use:

**👨‍🎓 Student Demo:**
- Email: `demo-student@omniscience.app`
- Password: `demo123`

**👩‍🏫 Teacher Demo:**
- Email: `demo-teacher@omniscience.app`
- Password: `demo123`

## Architecture

```
┌─────────────────────────────────┐
│ YOUR LOCAL MACHINE              │
│                                 │
│  Next.js (3000) ──▶ FastAPI    │
│                     (8123)      │
└────────┬────────────┬───────────┘
         │            │
         │ HTTP       │ HTTP
         │            │
┌────────▼────────────▼───────────┐
│ PRODUCTION (66.42.117.148)      │
│                                 │
│  Supabase (8000) + Letta (8283) │
│         │                       │
│    PostgreSQL                   │
└─────────────────────────────────┘
```

## What You Get

✅ **Hot Reload** - Instant code changes
✅ **Real Data** - Production database access
✅ **No Docker** - No local infrastructure needed
✅ **Auto Sync** - Changes reflect immediately
✅ **Full Debugging** - Access to all logs

## Important Notes

⚠️ **You're working with PRODUCTION data!**
- Be careful with database operations
- Use demo/test accounts for testing
- Don't delete real user data

⚠️ **Network Required**
- Needs internet connection
- Latency depends on network speed

## Troubleshooting

**Backend won't start:**
```bash
# Check if port 8123 is in use
lsof -i :8123

# View backend logs
tail -f .logs/backend.log
```

**Can't connect to production:**
```bash
# Test Supabase connection
curl http://66.42.117.148:8000/health

# Test Letta connection
curl http://66.42.117.148:8283/health
```

**Frontend errors:**
```bash
# View frontend logs
tail -f .logs/frontend.log

# Check if port 3000 is in use
lsof -i :3000
```

## Switching to Full Docker

To run everything locally in Docker:

```bash
# Stop local dev
./shutdown.sh

# Start Docker services
docker compose up -d

# Access at http://localhost:3082
```

## Files Reference

- `.env.local.dev` - Local dev config (connects to production)
- `.env` - Docker production config
- `startup.sh` - Start local dev servers
- `shutdown.sh` - Stop local dev servers
- `.logs/` - Development logs

## Need Help?

See `docs/local-dev-setup.md` for detailed documentation.
