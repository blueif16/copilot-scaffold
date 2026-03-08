# Deployment Runbook

## Prerequisites

- Docker and Docker Compose installed
- `.env` file configured with required secrets
- Git repository cloned

## Environment Variables

Required in `.env`:
```bash
GOOGLE_API_KEY=your-google-api-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key
JWT_SECRET=super-secret-jwt-token-with-at-least-32-characters-long
POSTGRES_PASSWORD=your-super-secret-and-long-postgres-password
NEXT_PUBLIC_SUPABASE_URL=http://your-server-ip:8000
```

## Initial Deployment

### 1. Start Services

```bash
docker-compose up -d
```

This starts all services:
- supabase-db (PostgreSQL)
- supabase-auth (GoTrue)
- supabase-rest (PostgREST)
- supabase-storage
- kong (API Gateway)
- letta (Memory system)
- backend (FastAPI)
- frontend (Next.js)

### 2. Verify Services

Check all containers are running:
```bash
docker-compose ps
```

Check health:
```bash
curl http://localhost:8124/health  # Backend
curl http://localhost:3082          # Frontend
```

### 3. Verify Database Trigger

The `on_auth_user_created` trigger should auto-create profiles:

```bash
docker exec omniscience-supabase-db psql -U postgres -d postgres -c \
  "SELECT tgname FROM pg_trigger WHERE tgname = 'on_auth_user_created';"
```

Should return:
```
        tgname
----------------------
 on_auth_user_created
```

## Updating Services

### Update Backend Code

```bash
# Rebuild backend image
docker-compose build backend

# Restart backend
docker-compose restart backend
```

### Update Frontend Code

```bash
# Rebuild frontend image
docker-compose build frontend

# Restart frontend
docker-compose restart frontend
```

### Update Database Schema

Database init scripts run only on first startup. For schema changes:

```bash
# Connect to database
docker exec -it omniscience-supabase-db psql -U postgres -d postgres

# Run your SQL commands
```

## Running Migrations

Database migrations are in `supabase/migrations/`. To apply:

```bash
docker exec omniscience-supabase-db psql -U postgres -d postgres < supabase/migrations/your-migration.sql
```

## Troubleshooting

### Backend Can't Connect to Letta

Check Letta is healthy:
```bash
docker logs omniscience-letta --tail 50
curl http://localhost:8283/v1/health/
```

Backend uses service name `letta:8283` - no need for IP addresses.

### Kong Gateway Issues

Check Kong logs:
```bash
docker logs omniscience-kong --tail 50
```

Verify kong.yml is mounted correctly:
```bash
docker exec omniscience-kong cat /var/lib/kong/kong.yml
```

### Database Trigger Not Working

Manually create the trigger:
```bash
docker exec omniscience-supabase-db psql -U postgres -d postgres <<'EOF'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, role, display_name)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'role', 'student'),
    COALESCE(new.raw_user_meta_data->>'display_name', new.email)
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
EOF
```

### JWT Verification Failing

Ensure JWT_SECRET matches across services:
- Backend: `JWT_SECRET` env var
- Supabase Auth: `GOTRUE_JWT_SECRET` env var
- Supabase REST: `PGRST_JWT_SECRET` env var

All should be: `super-secret-jwt-token-with-at-least-32-characters-long`

## Running E2E Tests

```bash
python .tasks/e2e-test-runner.py
```

Expected: 8/8 tests passing

## Stopping Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: deletes all data)
docker-compose down -v
```

## Logs

View logs for specific service:
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f letta
```

View all logs:
```bash
docker-compose logs -f
```
