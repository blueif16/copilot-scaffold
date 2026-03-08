# Supabase Self-Hosted Deployment Guide

## Overview

Self-hosted Supabase provides a complete backend stack using Docker Compose, including all services from the cloud platform. This guide covers setup, configuration, migrations, and integration patterns.

## Docker Compose Setup

### Initial Setup

```bash
# Clone Supabase repository
git clone --depth 1 https://github.com/supabase/supabase

# Create project directory
mkdir supabase-project

# Copy Docker configuration
cp -rf supabase/docker/* supabase-project

# Copy environment template
cp supabase/docker/.env.example supabase-project/.env

# Navigate to project
cd supabase-project

# Pull latest images
docker compose pull

# Start services
docker compose up -d
```

### Included Services

The Docker Compose stack includes:

- **Studio**: Web-based project management UI
- **Kong**: API gateway for routing and rate limiting
- **Auth (GoTrue)**: JWT-based authentication service
- **PostgREST**: Auto-generated RESTful API from PostgreSQL schema
- **Realtime**: WebSocket server for database change broadcasts
- **Storage**: S3-compatible file storage with imgproxy for image processing
- **postgres-meta**: PostgreSQL administration API
- **PostgreSQL**: Core database (with pgvector, extensions)
- **Edge Runtime**: Deno-based serverless functions
- **Logflare**: Log aggregation and management
- **Vector**: Observability data pipeline
- **Supavisor**: Connection pooler for PostgreSQL

## Required Environment Variables

### Core Configuration

```bash
# Never commit secrets to version control
JWT_SECRET=${JWT_SECRET}
ANON_KEY=${ANON_KEY}
SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY}

# Database
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB=postgres
POSTGRES_HOST=db
POSTGRES_PORT=5432

# API URLs
API_EXTERNAL_URL=http://localhost:8000
SUPABASE_PUBLIC_URL=http://localhost:8000
```

### Service-Specific Variables

```yaml
# PostgREST
services:
  rest:
    image: postgrest/postgrest
    environment:
      PGRST_JWT_SECRET: ${JWT_SECRET}
      PGRST_DB_URI: postgres://postgres:${POSTGRES_PASSWORD}@db:5432/postgres
```

### Storage Configuration (S3 Protocol)

```yaml
storage:
  environment:
    REGION: ${REGION}
    S3_PROTOCOL_ACCESS_KEY_ID: ${S3_PROTOCOL_ACCESS_KEY_ID}
    S3_PROTOCOL_ACCESS_KEY_SECRET: ${S3_PROTOCOL_ACCESS_KEY_SECRET}
```

### OAuth Provider Configuration

```bash
# .env file
GOOGLE_ENABLED=true
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_SECRET=your-google-client-secret
```

```yaml
# docker-compose.yml
auth:
  environment:
    GOTRUE_EXTERNAL_GOOGLE_ENABLED: ${GOOGLE_ENABLED}
    GOTRUE_EXTERNAL_GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID}
    GOTRUE_EXTERNAL_GOOGLE_SECRET: ${GOOGLE_SECRET}
    GOTRUE_EXTERNAL_GOOGLE_REDIRECT_URI: ${API_EXTERNAL_URL}/auth/v1/callback
```

## Local Development with Supabase CLI

### Initialize Project

```bash
# Initialize Supabase in current directory
supabase init

# Interactive mode with IDE settings
supabase init -i

# Force overwrite existing config
supabase init --force
```

### Start/Stop Local Stack

```bash
# Start all services
supabase start

# Start with specific containers excluded
supabase start -x gotrue,imgproxy

# Ignore health check failures
supabase start --ignore-health-check

# Stop with backup (default)
supabase stop

# Stop and delete all data volumes
supabase stop --no-backup

# Stop all projects
supabase stop --all
```

### Check Status

```bash
# Pretty print status
supabase status

# Output as environment variables
supabase status -o env

# Output as JSON
supabase status -o json

# Override variable names for env output
supabase status -o env --override-name api.url=NEXT_PUBLIC_SUPABASE_URL
```

## Database Migrations Workflow

### Creating Migrations

```bash
# Create new migration file
supabase migration new create_employees_table

# Creates timestamped file in supabase/migrations/
# Example: supabase/migrations/20240307120000_create_employees_table.sql
```

### Applying Migrations Locally

```bash
# Apply pending migrations
supabase migration up

# Reset database completely (reapply all migrations + seed data)
supabase db reset
```

### Applying Migrations to Remote/Self-Hosted

```bash
# Link to remote project
supabase link --project-ref YOUR_PROJECT_ID

# Push local migrations to remote
supabase db push
```

### Migration Best Practices

- Migrations are SQL files in `supabase/migrations/` directory
- Files are timestamped and applied in order
- Use `supabase db reset` during development to test full migration chain
- Use `supabase db push` to apply to staging/production
- Track migrations in version control

## Connection Patterns

### Frontend (Next.js)

```typescript
// Environment variables
NEXT_PUBLIC_SUPABASE_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Usage
const { data: { user }, error } = await supabase.auth.getUser()
```

### Backend (FastAPI/Python)

```python
from jose import jwt
import requests

# Fetch JWKS for token verification
jwks = requests.get('http://localhost:8000/auth/v1/.well-known/jwks.json').json()

def verify_access_token(token):
    try:
        payload = jwt.decode(
            token,
            jwks,
            algorithms=['RS256'],
            issuer='http://localhost:8000/auth/v1',
            audience='authenticated'
        )
        return payload
    except jwt.JWTError as e:
        print(f'Token verification failed: {e}')
        return None
```

### Direct Database Connection

```bash
# Connection string format
postgresql://postgres:${POSTGRES_PASSWORD}@localhost:5432/postgres

# From within Docker network
postgresql://postgres:${POSTGRES_PASSWORD}@db:5432/postgres
```

## Cloud vs Self-Hosted Differences

### JWT Secrets and Keys

- **Cloud**: Managed automatically, unique per project
- **Self-Hosted**: Must generate and configure manually in `.env`
- **Migration Impact**: Existing tokens from cloud are invalid on self-hosted; users must re-authenticate

### Authentication Providers

- **Cloud**: Configured via dashboard
- **Self-Hosted**: Configured via `GOTRUE_EXTERNAL_*` environment variables
- **Redirect URLs**: Must update OAuth provider consoles to point to self-hosted hostname (not `*.supabase.co`)

### Service URLs

- **Cloud**: `https://<project-ref>.supabase.co`
- **Self-Hosted**: Custom domain or `http://localhost:8000` (development)
- **API Endpoints**: Same structure but different base URL

### Storage and Files

- **Cloud**: Managed S3-compatible storage
- **Self-Hosted**: Requires S3 configuration or local volume mounts
- **Migration**: Storage objects must be transferred separately

### Email/SMTP

- **Cloud**: Built-in email service
- **Self-Hosted**: Must configure `SMTP_*` variables with your email provider

### Edge Functions

- **Cloud**: Deployed via CLI
- **Self-Hosted**: Manually copied to functions directory

## Common Gotchas

### 1. Security Hardening Required

The default Docker Compose configuration is **NOT production-ready**:

- Change all default passwords in `.env`
- Generate new JWT secrets (don't use example values)
- Review and update CORS settings
- Set up reverse proxy (nginx/Caddy) with SSL
- Configure network ACLs
- Establish backup procedures

### 2. JWT Secret Mismatch

- JWT secrets differ between cloud and self-hosted
- Tokens issued by one instance won't work on another
- Users must re-authenticate after migration
- Backend services must verify tokens against correct JWKS endpoint

### 3. OAuth Redirect URLs

- Update redirect URLs in OAuth provider consoles
- Format: `${API_EXTERNAL_URL}/auth/v1/callback`
- Must match exactly or authentication will fail

### 4. Database Connection Strings

- Use `db` hostname within Docker network
- Use `localhost` from host machine
- Port 5432 is mapped to host (check for conflicts)

### 5. Environment Variable Propagation

- Changes to `.env` require `docker compose restart`
- Some services cache configuration
- Use `docker compose down && docker compose up -d` for clean restart

### 6. Migration State

- Self-hosted doesn't track cloud migration history
- Start fresh or manually sync migration files
- Use `supabase db push` carefully in production

### 7. Service Dependencies

- Services start in dependency order
- Health checks may fail on slow machines
- Use `--ignore-health-check` flag if needed
- Check logs: `docker compose logs -f <service-name>`

### 8. Storage Configuration

- Default uses local volumes
- For S3 compatibility, configure `S3_PROTOCOL_*` variables
- Image transformations require imgproxy service

### 9. Realtime Subscriptions

- WebSocket connections require proper CORS configuration
- Check Kong gateway settings for WebSocket support
- Verify `API_EXTERNAL_URL` is accessible from client

### 10. Database Backups

- Not automatic in self-hosted setup
- Use `pg_dump` or `supabase db dump` regularly
- Test restore procedures before production use

## Integration Checklist

### Frontend Setup

- [ ] Set `NEXT_PUBLIC_SUPABASE_URL` to self-hosted URL
- [ ] Set `NEXT_PUBLIC_SUPABASE_ANON_KEY` from `.env`
- [ ] Update CORS settings in Kong configuration
- [ ] Test authentication flow
- [ ] Verify realtime subscriptions work

### Backend Setup

- [ ] Configure JWT verification with correct JWKS endpoint
- [ ] Use service role key for admin operations
- [ ] Set up direct database connection if needed
- [ ] Configure connection pooling (Supavisor)
- [ ] Test RLS policies

### Production Deployment

- [ ] Generate unique JWT secrets
- [ ] Change all default passwords
- [ ] Set up reverse proxy with SSL
- [ ] Configure custom domain
- [ ] Update OAuth redirect URLs
- [ ] Set up SMTP for emails
- [ ] Configure backup strategy
- [ ] Set up monitoring and logging
- [ ] Test disaster recovery procedures
- [ ] Document connection strings and secrets securely

## Quick Reference

```bash
# Start local development
supabase init
supabase start
supabase status

# Create and apply migration
supabase migration new my_change
# Edit SQL file
supabase db reset

# Deploy to self-hosted
supabase link --project-ref self-hosted
supabase db push

# Get connection info
supabase status -o env
```
