# Supabase Setup Guide

This project supports both **Supabase Cloud** and **Self-Hosted Supabase** via Docker Compose.

## Choosing Between Cloud and Self-Hosted

### Use Supabase Cloud When:
- You want managed infrastructure with automatic backups
- You need production-grade reliability and scaling
- You prefer not to manage database servers
- You want built-in email delivery and OAuth providers

### Use Self-Hosted When:
- You need full control over your data and infrastructure
- You're developing locally and want to avoid cloud dependencies
- You have specific compliance or data residency requirements
- You want to reduce operational costs for high-traffic applications

## Option 1: Supabase Cloud Setup

1. **Create a Supabase Project**
   - Go to https://supabase.com and sign up
   - Create a new project
   - Wait for the project to finish provisioning (~2 minutes)

2. **Get Your API Keys**
   - Go to Project Settings > API
   - Copy the following values:
     - Project URL (e.g., `https://xxxxx.supabase.co`)
     - `anon` public key
     - `service_role` secret key

3. **Configure Environment Variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and set:
   ```bash
   USE_SELFHOSTED_SUPABASE=false
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

4. **Run Database Migrations**
   ```bash
   # Install Supabase CLI if not already installed
   npm install -g supabase

   # Link to your cloud project
   supabase link --project-ref your-project-ref

   # Push migrations
   supabase db push
   ```

5. **Start the Application**
   ```bash
   # Without Docker
   npm run dev
   cd agent && uvicorn main:app --reload

   # With Docker (cloud Supabase only, no local Supabase services)
   docker-compose up backend frontend
   ```

## Option 2: Self-Hosted Supabase Setup

### Quick Start

1. **Configure Environment Variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and set:
   ```bash
   USE_SELFHOSTED_SUPABASE=true

   # Generate secure keys for production
   JWT_SECRET=$(openssl rand -base64 32)
   POSTGRES_PASSWORD=$(openssl rand -base64 32)

   # For development, you can use the default demo keys in .env.example
   ```

2. **Start All Services**
   ```bash
   docker-compose up -d
   ```

   This starts:
   - PostgreSQL (port 5432)
   - Supabase Studio (port 3000)
   - Kong API Gateway (port 8000)
   - Auth, REST, Realtime, Storage, Meta services
   - Backend API (port 8124)
   - Frontend (port 3082)

3. **Check Service Health**
   ```bash
   docker-compose ps
   ```

   Wait until all services show "healthy" status.

4. **Access Supabase Studio**
   - Open http://localhost:3000
   - Use this to manage your database, run SQL queries, and view data

5. **Run Database Migrations**
   ```bash
   # Initialize Supabase CLI in project
   supabase init

   # Create migration files in supabase/migrations/
   supabase migration new create_profiles_table

   # Apply migrations to local database
   supabase db reset
   ```

6. **Access the Application**
   - Frontend: http://localhost:3082
   - Backend API: http://localhost:8124
   - Supabase API: http://localhost:8000

### Service URLs (Self-Hosted)

When running in Docker Compose:

| Service | Internal URL (from containers) | External URL (from host) |
|---------|-------------------------------|--------------------------|
| Kong API Gateway | http://kong:8000 | http://localhost:8000 |
| PostgreSQL | postgresql://supabase-db:5432 | postgresql://localhost:5432 |
| Supabase Studio | http://supabase-studio:3000 | http://localhost:3000 |
| Backend API | http://backend:8123 | http://localhost:8124 |
| Frontend | http://frontend:3000 | http://localhost:3082 |

### Database Connection Strings

**From Docker containers:**
```
postgresql://postgres:${POSTGRES_PASSWORD}@supabase-db:5432/postgres
```

**From host machine:**
```
postgresql://postgres:${POSTGRES_PASSWORD}@localhost:5432/postgres
```

### Default Credentials (Development Only)

The `.env.example` includes demo JWT keys from Supabase's official examples. These are **NOT secure** for production.

**For production, generate new keys:**
```bash
# Generate JWT secret
openssl rand -base64 32

# Generate anon key (requires Supabase CLI)
supabase status -o env | grep ANON_KEY

# Or use online JWT generator with your JWT_SECRET
# Payload for anon key:
# {
#   "iss": "supabase",
#   "role": "anon",
#   "exp": 1983812996
# }
```

## Database Migrations

### Creating Migrations

```bash
# Create a new migration file
supabase migration new create_profiles_table

# Edit the generated file in supabase/migrations/
# Example: supabase/migrations/20240307120000_create_profiles_table.sql
```

### Applying Migrations

**Local/Self-Hosted:**
```bash
# Apply all pending migrations
supabase db reset

# Or apply incrementally
supabase migration up
```

**Cloud:**
```bash
# Link to your cloud project first
supabase link --project-ref your-project-ref

# Push migrations to cloud
supabase db push
```

### Example Migration: Profiles Table

Create `supabase/migrations/20240307_create_profiles.sql`:

```sql
-- Create profiles table (extends auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  role text check (role in ('student', 'teacher')) not null default 'student',
  display_name text,
  avatar_url text,
  created_at timestamptz default now()
);

-- Enable Row Level Security
alter table public.profiles enable row level security;

-- Policies
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Trigger to auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, role, display_name)
  values (new.id, 'student', new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

## Switching Between Cloud and Self-Hosted

You can switch between cloud and self-hosted by changing the `USE_SELFHOSTED_SUPABASE` variable:

```bash
# Use self-hosted
USE_SELFHOSTED_SUPABASE=true
NEXT_PUBLIC_SUPABASE_URL=http://localhost:8000

# Use cloud
USE_SELFHOSTED_SUPABASE=false
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
```

**Important:** JWT secrets differ between cloud and self-hosted. Users must re-authenticate when switching.

## Troubleshooting

### Services Won't Start

```bash
# Check logs
docker-compose logs -f supabase-db
docker-compose logs -f kong

# Restart services
docker-compose restart

# Clean restart
docker-compose down
docker-compose up -d
```

### Port Conflicts

If ports 5432, 8000, or 3000 are already in use:

```bash
# Check what's using the port
lsof -i :5432
lsof -i :8000
lsof -i :3000

# Stop conflicting services or change ports in docker-compose.yml
```

### Database Connection Errors

```bash
# Verify database is healthy
docker-compose ps supabase-db

# Check database logs
docker-compose logs supabase-db

# Test connection from host
psql postgresql://postgres:your-password@localhost:5432/postgres
```

### Kong Gateway Errors

```bash
# Verify kong.yml is mounted correctly
docker-compose exec kong cat /var/lib/kong/kong.yml

# Check Kong health
curl http://localhost:8000/

# Restart Kong
docker-compose restart kong
```

### Migration Failures

```bash
# Check migration files for syntax errors
supabase db lint

# View migration history
supabase migration list

# Rollback and retry
supabase db reset
```

## Production Deployment

### Security Checklist

- [ ] Generate unique JWT secrets (not demo keys)
- [ ] Change default PostgreSQL password
- [ ] Set up reverse proxy with SSL (nginx/Caddy)
- [ ] Configure custom domain
- [ ] Update OAuth redirect URLs in provider consoles
- [ ] Set up SMTP for email delivery
- [ ] Configure automated backups
- [ ] Set up monitoring and logging
- [ ] Review and tighten CORS settings in kong.yml
- [ ] Enable rate limiting in Kong
- [ ] Set up firewall rules

### Backup Strategy

```bash
# Manual backup
docker-compose exec supabase-db pg_dump -U postgres postgres > backup.sql

# Restore
docker-compose exec -T supabase-db psql -U postgres postgres < backup.sql

# Automated backups (add to cron)
0 2 * * * docker-compose exec supabase-db pg_dump -U postgres postgres | gzip > /backups/supabase-$(date +\%Y\%m\%d).sql.gz
```

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Self-Hosting Guide](https://supabase.com/docs/guides/self-hosting)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)
- [Kong Gateway Documentation](https://docs.konghq.com/)
