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

## Current Blocker: JWT Token Verification

### Status: ❌ BLOCKED

**Test Results**: 4/5 tests passing
- ✅ T2.1a: Student signup (users created successfully)
- ❌ T2.1b: Get user profile (500 Internal Server Error)
- ✅ T3.1: Teacher signup
- ✅ T5.1: Reject unauthenticated requests
- ✅ T5.2: Health check without auth

### Problem
Backend `/me` endpoint returns 500 error with message:
```
{"detail":"Token verification failed: invalid JWT: unable to parse or verify signature, signature is invalid"}
```

### Investigation
1. Supabase auth is issuing JWT tokens successfully
2. Tokens are being passed to backend correctly
3. Backend has correct `JWT_SECRET=super-secret-jwt-token-with-at-least-32-characters-long`
4. Supabase auth has matching `GOTRUE_JWT_SECRET`
5. **But**: `supabase.auth.get_user(token)` in backend is failing to verify signatures

### Hypothesis
The Supabase Python client's `auth.get_user()` method makes an HTTP call to the auth service at `SUPABASE_URL` (http://172.20.0.11:8000) to verify tokens. This might be failing because:
- The auth endpoint requires additional headers (apikey)
- The client is not configured correctly for self-hosted Supabase
- JWT verification should be done locally, not via API call

### Next Steps
1. Check if `supabase.auth.get_user()` needs the anon key in headers
2. Consider implementing local JWT verification using PyJWT instead of calling Supabase API
3. Test auth endpoint directly from backend container to see exact error

## Remaining Tests (Blocked)
- T2.1c: Create memory agent (requires auth to work)
- T2.2: Session tracking
- T2.3: Memory display
- T3: Teacher flow tests
- T4: Integration tests
- T5: Additional error handling tests
- T6: Compile results

## Files Modified
- `docker-compose.yml` - Fixed SUPABASE_URL for backend
- `.env` - Updated JWT_SECRET to match demo keys
- Created Kong container manually with correct network and volume mounts
- Created backend container manually with all required env vars
