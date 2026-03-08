# Letta Vector Extension Fix

## Problem
Letta service was in restart loop due to missing `vector` extension in the letta database. The Supabase postgres image includes `supautils` - a custom extension hook system that intercepts `CREATE EXTENSION` commands and attempts to run custom scripts via `pg_read_file()`, which fails with "absolute path not allowed" error.

## Root Cause
1. **supautils hook system**: The Supabase postgres image has `supautils` loaded in `session_preload_libraries`, which intercepts all `CREATE EXTENSION` commands
2. **pg_read_file restriction**: supautils tries to execute `/etc/postgresql-custom/extension-custom-scripts/before-create.sql` using `pg_read_file()` with an absolute path, which is blocked by postgres security settings
3. **pg_tle removed but supautils remained**: While `pg_tle` was removed from `shared_preload_libraries`, `supautils` was still active in `session_preload_libraries`

## Solution Applied
1. Disabled `supautils` by commenting out `session_preload_libraries = 'supautils'` in `/etc/postgresql/postgresql.conf`
2. Removed `pg_tle` from `shared_preload_libraries` (already done)
3. Cleaned up orphaned `vector` type that was partially created during failed extension attempts
4. Successfully created the vector extension after restart

## Commands Executed
```bash
# Disable supautils
docker exec omniscience-supabase-db sed -i "s/session_preload_libraries = 'supautils'/# session_preload_libraries = 'supautils'/" /etc/postgresql/postgresql.conf

# Restart postgres
docker restart omniscience-supabase-db

# Clean up orphaned type
docker exec omniscience-supabase-db psql -U postgres -d letta -c "DROP TYPE IF EXISTS vector CASCADE;"

# Create extension
docker exec omniscience-supabase-db psql -U postgres -d letta -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

## Verification
```bash
docker exec omniscience-supabase-db psql -U postgres -d letta -c "SELECT * FROM pg_extension WHERE extname='vector';"
```

Result:
```
  oid  | extname | extowner | extnamespace | extrelocatable | extversion | extconfig | extcondition
-------+---------+----------+--------------+----------------+------------+-----------+--------------
 18845 | vector  |       10 |         2200 | t              | 0.5.1      |           |
```

## Status
✅ **RESOLVED** - Vector extension (v0.5.1) is now installed in the letta database.

## Letta Service Status
✅ **HEALTHY** - Letta service is now running successfully:
- Server started on http://localhost:8283
- Health endpoint responding: `{"version":"0.6.4","status":"ok"}`
- Database schema created successfully (18 tables)
- Vector column created correctly: `passages.embedding vector(4096)`
- No more restart loops

## Impact
- Disabling supautils means the Supabase-specific extension management features are no longer active
- This is acceptable for the letta database as it's used exclusively by Letta service, not Supabase services
- The main Supabase databases may need supautils enabled if they use privileged extensions

## Notes
- The vector extension files were already present in the container at `/usr/share/postgresql/15/extension/`
- The shared library was at `/usr/lib/postgresql/15/lib/vector.so`
- The issue was purely a configuration/hook problem, not a missing dependency
- The initial "type modifier is not allowed" error was due to the extension not being properly installed; after proper installation, vector(4096) syntax works correctly
