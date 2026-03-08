# Supabase Integration Cheatsheet

## Installation

### JavaScript/TypeScript (Next.js)
```bash
npm install @supabase/supabase-js @supabase/ssr
```

### Python (FastAPI)
```bash
pip install supabase
```

## Next.js 14+ App Router Integration

### Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 1. Browser Client (Client Components)
```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

Usage in client components:
```typescript
'use client'
import { createClient } from '@/lib/supabase/client'

export default function ClientComponent() {
  const supabase = createClient()

  // Get verified user (contacts auth server)
  const { data: { user } } = await supabase.auth.getUser()

  // Sign in
  await supabase.auth.signInWithPassword({
    email: 'user@example.com',
    password: 'password123'
  })
}
```

### 2. Server Client (Server Components - Read Only)
```typescript
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        }
        // setAll omitted - server components can't set cookies
      }
    }
  )
}
```

Usage in server components:
```typescript
import { createClient } from '@/lib/supabase/server'

export default async function ServerComponent() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return <div>Hello {user?.email}</div>
}
```

### 3. Middleware (Session Refresh)
```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        }
      }
    }
  )

  // CRITICAL: Refresh session before response is sent
  await supabase.auth.getUser()

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

### 4. Route Handlers (Full Cookie Access)
```typescript
// app/api/auth/signout/route.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        }
      }
    }
  )

  await supabase.auth.signOut()
  return NextResponse.json({ success: true })
}
```

## Python Backend Integration (FastAPI)

### Environment Variables
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Client Initialization
```python
import os
from supabase import create_client, Client
from supabase import ClientOptions
from supabase_auth import SyncMemoryStorage

# Basic client (anon key - respects RLS)
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_ANON_KEY")
supabase: Client = create_client(url, key)

# Client with custom options
options = ClientOptions(
    schema="public",
    headers={"x-custom-header": "value"},
    auto_refresh_token=True,
    persist_session=True,
    storage=SyncMemoryStorage()
)
supabase: Client = create_client(url, key, options)

# Service role client (bypasses RLS - use carefully!)
service_key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
admin_supabase: Client = create_client(url, service_key)
```

### FastAPI Integration Pattern
```python
from fastapi import FastAPI, Depends, HTTPException
from supabase import Client, create_client
import os

app = FastAPI()

def get_supabase() -> Client:
    """Dependency for anon client (respects RLS)"""
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_ANON_KEY")
    return create_client(url, key)

def get_admin_supabase() -> Client:
    """Dependency for service role client (bypasses RLS)"""
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    return create_client(url, key)

@app.get("/users/{user_id}")
async def get_user(user_id: str, supabase: Client = Depends(get_supabase)):
    """Uses anon key - RLS policies apply"""
    response = supabase.table("users").select("*").eq("id", user_id).execute()
    return response.data

@app.post("/admin/users")
async def create_user_admin(
    user_data: dict,
    supabase: Client = Depends(get_admin_supabase)
):
    """Uses service role - bypasses RLS"""
    response = supabase.table("users").insert(user_data).execute()
    return response.data
```

### Async Client (for async FastAPI)
```python
from supabase_auth import AsyncGoTrueClient

headers = {
    "apiKey": os.environ.get("SUPABASE_ANON_KEY"),
}
auth_client = AsyncGoTrueClient(
    url=os.environ.get("SUPABASE_URL"),
    headers=headers
)

async def authenticate_user(email: str, password: str):
    user = await auth_client.sign_in_with_password(
        email=email,
        password=password
    )
    return user
```

## Authentication Patterns

### Next.js Auth Flow
```typescript
// Sign up
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123'
})

// Sign in with password
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
})

// Sign in with magic link
const { data, error } = await supabase.auth.signInWithOtp({
  email: 'user@example.com'
})

// Sign in with OAuth
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google'
})

// Sign out
await supabase.auth.signOut()

// Get session (unverified - from cookies)
const { data: { session } } = await supabase.auth.getSession()

// Get user (verified - contacts auth server)
const { data: { user } } = await supabase.auth.getUser()
```

### Python Auth Flow
```python
# Synchronous
from supabase_auth import SyncGoTrueClient

headers = {"apiKey": "your-anon-key"}
client = SyncGoTrueClient(url="https://your-project.supabase.co", headers=headers)

# Sign up
user = client.sign_up(email="example@gmail.com", password="*********")

# Sign in with password
user = client.sign_in_with_password(email="example@gmail.com", password="*********")

# Sign in with magic link
user = client.sign_in_with_otp(email="example@gmail.com")

# Sign in with OAuth
user = client.sign_in_with_oauth(provider="google")

# Sign out
client.sign_out()

# Get current user
user = client.get_user()

# Update user profile
user = client.update_user({"data": {"name": "John Doe"}})
```

## Row Level Security (RLS) Best Practices

### Enable RLS on All Tables
```sql
-- Enable RLS
ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;
```

### Basic User-Scoped Policy
```sql
-- Users can only access their own data
CREATE POLICY "Users can view own data"
ON user_data FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own data"
ON user_data FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own data"
ON user_data FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own data"
ON user_data FOR DELETE
USING (auth.uid() = user_id);
```

### OAuth Client Restriction (Principle of Least Privilege)
```sql
-- Bad: Grant all access by default
CREATE POLICY "OAuth clients full access"
ON user_data FOR ALL
USING (auth.uid() = user_id);

-- Good: Grant specific access per client
CREATE POLICY "Specific client specific access"
ON user_data FOR SELECT
USING (
  auth.uid() = user_id AND
  (auth.jwt() ->> 'client_id') = 'trusted-client-id'
);
```

### Role-Based Policies
```sql
-- Authenticated users only
CREATE POLICY "rls_test_select"
ON test_table
TO authenticated
USING ((SELECT auth.uid()) = user_id);

-- Public read, authenticated write
CREATE POLICY "Public read access"
ON posts FOR SELECT
USING (true);

CREATE POLICY "Authenticated write access"
ON posts FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = author_id);
```

## Key Concepts

### Service Role vs Anon Key

**Anon Key (Frontend & Backend)**
- Respects RLS policies
- Safe to expose in client-side code
- Use for user-scoped operations
- Default choice for most operations

**Service Role Key (Backend Only)**
- Bypasses ALL RLS policies
- NEVER expose in client-side code
- Use only for admin operations
- Store securely in backend environment variables

### Auth Verification

**getSession() vs getUser()**
- `getSession()`: Reads from cookies (unverified, fast)
- `getUser()`: Contacts auth server (verified, authoritative)
- **Always use `getUser()` for authorization decisions**

### Cookie Management

The `@supabase/ssr` library automatically handles:
- Cookie chunking for large sessions
- Base64-URL encoding for safe cookie values
- Automatic session refresh
- Token refresh (refresh tokens are single-use)

## Common Gotchas

1. **Middleware Must Refresh Session**: Always call `await supabase.auth.getUser()` in middleware before returning response to keep cookies synchronized.

2. **Server Components Can't Set Cookies**: Omit `setAll` in server component clients. Use route handlers or server actions for mutations.

3. **RLS Must Be Enabled**: Tables without RLS allow any client with the anon key to access/modify data. Enable RLS on all tables in production.

4. **Service Role Key Security**: Never expose service role key in client code or commit to version control. It bypasses all security policies.

5. **Concurrent Requests**: Refresh tokens are single-use. The library handles this, but be aware of race conditions in high-concurrency scenarios.

6. **Use getUser() for Auth Checks**: Don't rely on `getSession()` for authorization - it reads unverified cookie data. Always use `getUser()` which validates with the auth server.

7. **Python Client Types**: Use `Client` for sync operations, `AsyncGoTrueClient` for async auth operations in FastAPI.

8. **Middleware Matcher**: Configure middleware matcher to exclude static assets and API routes that don't need auth refresh.

## Production Checklist

- [ ] Enable RLS on all tables
- [ ] Configure security policies via Dashboard > Authentication > Policies
- [ ] Use anon key for client-side and user-scoped backend operations
- [ ] Store service role key securely (backend only, never in git)
- [ ] Implement middleware for session refresh in Next.js
- [ ] Use `getUser()` instead of `getSession()` for authorization
- [ ] Test policies with different user roles
- [ ] Enable replication for sensitive data tables
- [ ] Configure cookie options for production (secure, sameSite)
- [ ] Set up proper CORS policies for your domain
