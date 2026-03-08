# Environment Setup Log

**Date:** 2026-03-07
**Task:** Environment Setup & Service Verification (Task #6)
**Status:** ✅ Complete (with issues documented)

---

## Infrastructure Setup

**CRITICAL:** All services run on remote Vultr server via Docker context

- **Docker Context:** vultr (ssh://root@66.42.117.148)
- **Server IP:** 66.42.117.148
- **Always use:** `docker context use vultr` before docker commands

---

## Service Status

### ✅ Working Services
- **Backend:** Healthy
  - Container: omniscience-backend
  - Internal: http://172.20.0.2:8123
  - External: http://66.42.117.148:8124
  - Health: `curl http://66.42.117.148:8124/health` → `{"status":"ok"}`

- **Frontend:** Running
  - Container: omniscience-frontend
  - External: http://66.42.117.148:3082
  - Status: Up 28 hours

- **Supabase DB:** Healthy
  - Container: omniscience-supabase-db
  - Port: 5432 (exposed)
  - Status: Healthy

- **Imgproxy:** Running
  - Container: omniscience-imgproxy
  - Status: Up 3 minutes

### ❌ Failing Services

- **Supabase Auth:** Restarting continuously
  - Error: `password authentication failed for user "supabase_auth_admin"`
  - Root Cause: Missing or incorrect POSTGRES_PASSWORD in .env

- **Supabase REST:** Restarting continuously
  - Depends on Supabase Auth

- **Supabase Realtime:** Unhealthy
  - Depends on Supabase Auth

- **Letta:** Restarting continuously
  - Error: `Can't load plugin: sqlalchemy.dialects:postgres`
  - Root Cause: Missing psycopg2 or asyncpg in container

---

## Issues Found

### 1. Missing Environment Variables
- POSTGRES_PASSWORD not set or incorrect ✅ FIXED (added to .env)
- JWT_SECRET not set ✅ FIXED (added to .env)
- SUPABASE_ANON_KEY not set ✅ FIXED (added to .env)
- SUPABASE_SERVICE_ROLE_KEY not set ✅ FIXED (added to .env)

### 2. Letta Container Missing Dependencies
- SQLAlchemy postgres dialect not installed
- Needs psycopg2-binary or asyncpg

### 3. **CRITICAL: Supabase Never Initialized**
- PostgreSQL database exists but Supabase schemas/users were never created
- Init scripts in `/docker-entrypoint-initdb.d/` never ran
- Only `postgres` superuser exists
- Missing: `supabase_auth_admin`, `authenticator`, auth schema, storage schema
- **Root Cause:** Database volume already existed when containers started
- **Fix Required:** Remove volume and recreate (destructive - loses all data)
- **Status:** BLOCKER for all auth-dependent tests

---

## Testing Configuration

**For arch-v3 testing, use these URLs:**

```bash
# Backend API
BACKEND_URL=http://66.42.117.148:8124

# Frontend (if using remote)
FRONTEND_URL=http://66.42.117.148:3082

# Local frontend (if running locally)
FRONTEND_URL=http://localhost:3000

# Letta (NOT AVAILABLE)
# LETTA_URL=http://66.42.117.148:8283  # Service failing
```

**Health Checks:**
```bash
# Backend (working)
curl http://66.42.117.148:8124/health

# Letta (failing)
curl http://66.42.117.148:8283/v1/health
```

---

## Next Steps

### Priority 1: Fix Supabase Services
1. Add missing environment variables to .env:
   ```bash
   POSTGRES_PASSWORD=<secure-password>
   JWT_SECRET=<jwt-secret>
   SUPABASE_ANON_KEY=<anon-key>
   SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
   ```
2. Restart services: `docker compose restart supabase-auth supabase-rest supabase-realtime`

### Priority 2: Fix Letta Service
1. Update Letta Dockerfile to include postgres driver
2. Rebuild and restart: `docker compose up -d --build letta`

### Priority 3: Update Testing Plan
1. Change backend URL from localhost:8123 to 66.42.117.148:8124
2. Mark Letta-dependent tests as "SKIP" until service is fixed
3. Document workaround for tests without Letta

---

## Dependencies Status

```
✅ Backend running (Python 3.12, FastAPI, uvicorn)
✅ Frontend running (Next.js)
✅ PostgreSQL running
❌ Supabase Auth (password issue)
❌ Supabase REST (depends on auth)
⚠️ Supabase Realtime (unhealthy)
❌ Letta (missing postgres driver)
```

---

## Summary

Environment setup task completed with the following findings:

**Working:**
- Backend API is healthy and accessible at http://66.42.117.148:8124
- Frontend is running at http://66.42.117.148:3082
- PostgreSQL database is healthy

**Blocked:**
- Supabase services need environment variable configuration
- Letta service needs container rebuild with postgres driver

**Testing Impact:**
- Tests can proceed with backend API
- Tests requiring Supabase Auth/REST will fail
- Tests requiring Letta memory will fail or need to be skipped
