# E2E Testing Progress Summary

## Date: 2026-03-07

## Infrastructure Fixes Completed

### ✅ T1: Service Verification (DONE)
- All core services operational
- Backend healthy at http://66.42.117.148:8124
- Frontend running at http://66.42.117.148:3082
- Database connected and healthy
- Letta vector extension fixed (disabled supautils)

### ✅ Kong Gateway Fixed
- **Issue**: Kong was crash-looping because `kong.yml` was mounted as a directory instead of a file
- **Root Cause**: Docker Compose was run with remote context but volume mounts referenced local macOS paths that don't exist on Vultr server
- **Fix**:
  - Copied `kong.yml` to `/root/omniscience/supabase/kong.yml` on remote server
  - Recreated Kong container with correct volume mount: `-v /root/omniscience/supabase/kong.yml:/var/lib/kong/kong.yml:ro`
  - Kong now healthy and routing requests

### ✅ Backend Environment Configuration Fixed
- **Issue**: Backend had `SUPABASE_URL=${USE_SELFHOSTED_SUPABASE:-false}` (wrong variable)
- **Fix**: Updated to `SUPABASE_URL=http://172.20.0.11:8000` (Kong's IP)
- **Issue**: Backend couldn't resolve 'kong' hostname via DNS
- **Fix**: Used Kong's IP address directly (172.20.0.11)
- **Issue**: `GOOGLE_API_KEY` not being passed correctly
- **Fix**: Sourced .env file before docker run to expand variables

### ✅ JWT Secret Alignment
- **Issue**: `.env` had `JWT_SECRET=your-super-secret...` but Supabase demo keys use `super-secret...`
- **Fix**: Updated `.env` to use correct demo secret: `super-secret-jwt-token-with-at-least-32-characters-long`
- Restarted Supabase auth service

## ✅ JWT Token Verification Fixed (Commit 057bfb7)

**Previous Issue**: Backend `/me` endpoint was failing with JWT signature verification errors.

**Solution**: Implemented local JWT verification using PyJWT instead of calling Supabase API.

## ✅ Database Trigger Fixed

### Issue
- Users were signing up successfully in `auth.users`
- But profiles were not being created in `public.profiles` table
- Backend endpoint `/api/students/{user_id}/create-memory-agent` returned 404 "User not found"

### Root Cause
The database trigger `on_auth_user_created` was missing. The migration file existed but was never applied to the production database.

### Fix
1. Created the trigger function `handle_new_user()`
2. Created the trigger `on_auth_user_created` on `auth.users` table
3. Backfilled profiles for 25 existing users

### Test Results: ✅ ALL PASSING (6/6)
- ✅ T2.1a: Student signup
- ✅ T2.1b: Get user profile
- ✅ T2.1c: Create memory agent
- ✅ T3.1: Teacher signup
- ✅ T5.1: Reject unauthenticated requests
- ✅ T5.2: Health check without auth

## Next Steps

### Immediate
All basic E2E tests are passing. The infrastructure is now stable:
- ✅ Authentication working (JWT verification)
- ✅ User signup creating profiles automatically
- ✅ Memory agent creation working
- ✅ Authorization checks working

### Remaining Work
- Expand test coverage (session tracking, memory display, teacher flows)
- Integration tests
- Performance testing
- Deploy to production

## Files Modified
- `docker-compose.yml` - Fixed SUPABASE_URL for backend
- `.env` - Updated JWT_SECRET to match demo keys
- Created Kong container manually with correct network and volume mounts
- Created backend container manually with all required env vars
- Database: Created trigger `on_auth_user_created` and function `handle_new_user()`
- Database: Backfilled 25 user profiles
