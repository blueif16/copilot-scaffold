# Production Environment Setup Documentation

**Task:** T2 - Create Production Environment Files
**Date:** 2026-03-14
**Server:** 66.42.117.148

---

## Overview

Created production-ready environment configuration files based on Docker audit findings. All sensitive values use secure placeholders and require generation before deployment.

## Files Created

1. **`.env.production`** - Production environment file (DO NOT COMMIT)
2. **`.env.production.example`** - Template with documentation (safe to commit)

---

## Required Secrets and How to Obtain Them

### 1. JWT_SECRET (Critical)

**Purpose:** Signs and verifies JWT tokens for Supabase authentication
**Used by:** All Supabase services (Auth, REST, Realtime, Storage)
**Requirements:** Minimum 32 characters, cryptographically secure

**Generate:**
```bash
openssl rand -base64 32
```

**Example output:**
```
7xK9mP2nQ4vR8sT1wY6zB3cD5eF7gH9j
```

---

### 2. POSTGRES_PASSWORD (Critical)

**Purpose:** PostgreSQL database root password
**Used by:** All services connecting to database (Supabase, Letta, Backend)
**Requirements:** Strong password, minimum 32 characters

**Generate:**
```bash
openssl rand -base64 32
```

**Important:** Use the SAME password in both:
- `POSTGRES_PASSWORD=...`
- `DATABASE_URL=postgresql://postgres:PASSWORD@...`

---

### 3. SUPABASE_ANON_KEY (Critical)

**Purpose:** Public API key for client-side requests (read-only access)
**Used by:** Frontend application, public API calls
**Requirements:** JWT token signed with JWT_SECRET, role: "anon"

**Generate using Supabase CLI:**
```bash
# Install Supabase CLI first
npm install -g supabase

# Generate keys
supabase gen keys --project-ref YOUR_PROJECT
```

**Alternative - Generate using Docker:**
```bash
# Replace YOUR_JWT_SECRET with the JWT_SECRET you generated
docker run --rm supabase/gotrue:v2.132.3 \
  gotrue generate keys --secret YOUR_JWT_SECRET
```

**Alternative - Use online tool:**
https://supabase.com/docs/guides/self-hosting/docker#generate-api-keys

**JWT Payload for anon key:**
```json
{
  "iss": "supabase",
  "role": "anon",
  "exp": 1983812996
}
```

---

### 4. SUPABASE_SERVICE_ROLE_KEY (Critical)

**Purpose:** Admin API key for server-side requests (full access)
**Used by:** Backend service for database operations
**Requirements:** JWT token signed with JWT_SECRET, role: "service_role"

**Generate:** Same methods as SUPABASE_ANON_KEY above

**JWT Payload for service_role key:**
```json
{
  "iss": "supabase",
  "role": "service_role",
  "exp": 1983812996
}
```

---

### 5. DB_ENC_KEY (Critical)

**Purpose:** Encrypts Supabase Realtime database connections
**Used by:** Supabase Realtime service
**Requirements:** Minimum 32 characters

**Generate:**
```bash
openssl rand -base64 32
```

---

### 6. SECRET_KEY_BASE (Critical)

**Purpose:** Session encryption for Supabase Realtime
**Used by:** Supabase Realtime service
**Requirements:** Minimum 64 characters

**Generate:**
```bash
openssl rand -base64 64
```

---

### 7. GOOGLE_API_KEY (Required)

**Purpose:** Google Gemini API for AI/LLM functionality
**Used by:** Backend service for course generation and chat
**Obtain from:** https://makersuite.google.com/app/apikey

**Steps:**
1. Go to Google AI Studio
2. Create new API key or use existing
3. Copy the key (starts with `AIza...`)
4. Paste into `GOOGLE_API_KEY`

---

### 8. LANGSMITH_API_KEY (Optional)

**Purpose:** LangGraph agent debugging and observability
**Used by:** Backend service for tracing agent execution
**Obtain from:** https://smith.langchain.com/

**Steps:**
1. Sign up for LangSmith account
2. Go to Settings > API Keys
3. Create new API key
4. Copy and paste into `LANGSMITH_API_KEY`

**Note:** Leave empty if not using LangSmith

---

## Environment Variable Mapping

### Backend Service (omniscience-backend)

**Required:**
- `GOOGLE_API_KEY` - Gemini API for AI functionality
- `SUPABASE_URL` - Internal URL to Kong gateway (http://kong:8000)
- `SUPABASE_SERVICE_ROLE_KEY` - Admin access to Supabase
- `JWT_SECRET` - JWT verification
- `LETTA_BASE_URL` - Internal URL to Letta (http://letta:8283)

**Optional:**
- `LANGSMITH_API_KEY` - Agent tracing

**Environment:**
```yaml
environment:
  - GOOGLE_API_KEY=${GOOGLE_API_KEY}
  - LANGSMITH_API_KEY=${LANGSMITH_API_KEY:-}
  - SUPABASE_URL=http://kong:8000
  - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
  - JWT_SECRET=${JWT_SECRET}
  - LETTA_BASE_URL=http://letta:8283
```

---

### Frontend Service (omniscience-frontend)

**Required:**
- `NEXT_PUBLIC_SUPABASE_URL` - Public Supabase URL (http://66.42.117.148:8000)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Public API key
- `BACKEND_URL` - Internal backend URL (http://backend:8123)

**Build Args:**
- `NEXT_PUBLIC_SUPABASE_URL` - Baked into build
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Baked into build

**Environment:**
```yaml
build:
  args:
    - NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
    - NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
environment:
  - BACKEND_URL=http://backend:8123
  - NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
  - NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
```

---

### Supabase Database (supabase-db)

**Required:**
- `POSTGRES_PASSWORD` - Database root password

**Environment:**
```yaml
environment:
  POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
  POSTGRES_DB: postgres
```

---

### Supabase Auth (supabase-auth / GoTrue)

**Required:**
- `GOTRUE_DB_DATABASE_URL` - Database connection (uses POSTGRES_PASSWORD)
- `GOTRUE_JWT_SECRET` - JWT signing key
- `GOTRUE_SITE_URL` - Frontend URL for redirects
- `API_EXTERNAL_URL` - Public Supabase URL

**Optional:**
- `GOTRUE_DISABLE_SIGNUP` - Disable public signups
- `GOTRUE_EXTERNAL_EMAIL_ENABLED` - Enable email auth
- `GOTRUE_MAILER_AUTOCONFIRM` - Auto-confirm emails
- `SMTP_*` - Email configuration

**Environment:**
```yaml
environment:
  GOTRUE_DB_DATABASE_URL: postgres://supabase_auth_admin:${POSTGRES_PASSWORD}@supabase-db:5432/postgres
  GOTRUE_JWT_SECRET: ${JWT_SECRET}
  GOTRUE_SITE_URL: ${SITE_URL}
  API_EXTERNAL_URL: ${SUPABASE_PUBLIC_URL}
  GOTRUE_DISABLE_SIGNUP: ${DISABLE_SIGNUP:-false}
  # ... SMTP settings
```

---

### Supabase REST (PostgREST)

**Required:**
- `PGRST_DB_URI` - Database connection (uses POSTGRES_PASSWORD)
- `PGRST_JWT_SECRET` - JWT verification

**Environment:**
```yaml
environment:
  PGRST_DB_URI: postgres://authenticator:${POSTGRES_PASSWORD}@supabase-db:5432/postgres
  PGRST_JWT_SECRET: ${JWT_SECRET}
  PGRST_DB_SCHEMAS: public,storage,graphql_public
  PGRST_DB_ANON_ROLE: anon
```

---

### Supabase Realtime

**Required:**
- `DB_PASSWORD` - Database password
- `API_JWT_SECRET` - JWT verification
- `DB_ENC_KEY` - Database encryption key
- `SECRET_KEY_BASE` - Session encryption

**Environment:**
```yaml
environment:
  DB_PASSWORD: ${POSTGRES_PASSWORD}
  API_JWT_SECRET: ${JWT_SECRET}
  DB_ENC_KEY: ${DB_ENC_KEY}
  SECRET_KEY_BASE: ${SECRET_KEY_BASE}
```

---

### Supabase Storage

**Required:**
- `ANON_KEY` - Public API key
- `SERVICE_KEY` - Admin API key
- `PGRST_JWT_SECRET` - JWT verification
- `DATABASE_URL` - Database connection (uses POSTGRES_PASSWORD)

**Environment:**
```yaml
environment:
  ANON_KEY: ${SUPABASE_ANON_KEY}
  SERVICE_KEY: ${SUPABASE_SERVICE_ROLE_KEY}
  PGRST_JWT_SECRET: ${JWT_SECRET}
  DATABASE_URL: postgres://supabase_storage_admin:${POSTGRES_PASSWORD}@supabase-db:5432/postgres
```

---

### Supabase Studio

**Required:**
- `SUPABASE_ANON_KEY` - Public API key
- `SUPABASE_SERVICE_KEY` - Admin API key
- `SUPABASE_PUBLIC_URL` - Public Supabase URL

**Environment:**
```yaml
environment:
  SUPABASE_URL: http://kong:8000
  SUPABASE_PUBLIC_URL: ${SUPABASE_PUBLIC_URL}
  SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY}
  SUPABASE_SERVICE_KEY: ${SUPABASE_SERVICE_ROLE_KEY}
```

---

### Letta

**Required:**
- `LETTA_PG_URI` - Database connection (uses POSTGRES_PASSWORD)

**Environment:**
```yaml
environment:
  LETTA_PG_URI: postgresql://postgres:${POSTGRES_PASSWORD}@supabase-db:5432/letta
```

---

## Security Notes

### Critical Security Requirements

1. **Never commit `.env.production` to git**
   - Add to `.gitignore` immediately
   - Only commit `.env.production.example`

2. **Generate unique secrets for production**
   - DO NOT use default/demo secrets
   - DO NOT reuse secrets from development
   - DO NOT use the example secrets from Supabase docs

3. **Protect secret files**
   ```bash
   chmod 600 .env.production
   ```

4. **Use environment-specific secrets**
   - Development: `.env.local.dev`
   - Production: `.env.production`
   - Never mix environments

5. **Rotate secrets regularly**
   - JWT_SECRET: Every 90 days
   - POSTGRES_PASSWORD: Every 90 days
   - API keys: When compromised or annually

---

### Network Security

1. **Restrict PostgreSQL port access**
   ```bash
   # Only allow localhost and Docker network
   sudo ufw allow from 172.16.0.0/12 to any port 5432
   sudo ufw deny 5432
   ```

2. **Use reverse proxy with SSL**
   - Install Nginx or Traefik
   - Configure SSL certificates (Let's Encrypt)
   - Terminate SSL at proxy, forward to Docker services

3. **Configure firewall rules**
   ```bash
   # Allow only necessary ports
   sudo ufw allow 80/tcp    # HTTP
   sudo ufw allow 443/tcp   # HTTPS
   sudo ufw allow 22/tcp    # SSH
   sudo ufw deny 5432/tcp   # PostgreSQL (block external)
   sudo ufw deny 8000/tcp   # Kong (use reverse proxy instead)
   ```

---

## Deployment Checklist

### Pre-Deployment

- [ ] Copy `.env.production.example` to `.env.production`
- [ ] Generate `JWT_SECRET` with `openssl rand -base64 32`
- [ ] Generate `POSTGRES_PASSWORD` with `openssl rand -base64 32`
- [ ] Generate `DB_ENC_KEY` with `openssl rand -base64 32`
- [ ] Generate `SECRET_KEY_BASE` with `openssl rand -base64 64`
- [ ] Generate Supabase keys using JWT_SECRET
- [ ] Update `DATABASE_URL` with same POSTGRES_PASSWORD
- [ ] Add Google Gemini API key
- [ ] Configure SMTP settings (if using email auth)
- [ ] Verify all placeholders are replaced
- [ ] Add `.env.production` to `.gitignore`
- [ ] Set file permissions: `chmod 600 .env.production`

### Deployment

- [ ] Copy `.env.production` to server at `/Users/tk/Desktop/Omniscience/.env`
- [ ] Verify Docker context is set to remote server
- [ ] Build images: `docker-compose build`
- [ ] Start services: `docker-compose up -d`
- [ ] Check logs: `docker-compose logs -f`
- [ ] Verify health checks: `docker ps`
- [ ] Test frontend: http://66.42.117.148:3082
- [ ] Test backend: http://66.42.117.148:8124/health
- [ ] Test Supabase: http://66.42.117.148:8000

### Post-Deployment

- [ ] Configure automated database backups
- [ ] Set up monitoring (Prometheus + Grafana)
- [ ] Configure log aggregation (ELK/Loki)
- [ ] Set up SSL/TLS with reverse proxy
- [ ] Configure firewall rules
- [ ] Test authentication flow
- [ ] Test course creation flow
- [ ] Test file uploads to Supabase Storage
- [ ] Document backup/restore procedures
- [ ] Set up alerting for service failures

---

## Troubleshooting

### Issue: "column does not exist" after migration

**Cause:** PostgREST caches database schema
**Fix:** Restart PostgREST after schema changes
```bash
docker restart omniscience-supabase-rest
```

### Issue: "new row violates row-level security policy" on storage uploads

**Cause:** Storage tables not owned by supabase_storage_admin
**Fix:** Check and fix table ownership
```bash
docker exec -i omniscience-supabase-db psql -U postgres -d postgres -c \
  "SELECT tableowner FROM pg_tables WHERE schemaname = 'storage';"
```

### Issue: Services fail to start with "connection refused"

**Cause:** Dependency services not ready
**Fix:** Check health checks and service order
```bash
docker-compose ps
docker-compose logs supabase-db
```

### Issue: JWT verification fails

**Cause:** Mismatched JWT_SECRET across services
**Fix:** Ensure all services use same JWT_SECRET
```bash
# Check environment variables
docker exec omniscience-supabase-auth env | grep JWT
docker exec omniscience-supabase-rest env | grep JWT
```

---

## References

- Docker audit report: `.godag/context/T1-docker-audit.md`
- Current dev config: `.env.local.dev`
- Docker compose: `docker-compose.yml`
- Supabase self-hosting docs: https://supabase.com/docs/guides/self-hosting/docker
- JWT generation: https://jwt.io/
