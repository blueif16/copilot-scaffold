# Auth Debug Prompt

## The Problem
Login with demo accounts (demo-teacher@omniscience.app / demo123) succeeds but profile is never fetched. The app redirects to "/" but shows no courses/content because `profile` in AuthContext is null.

## What Works
- Supabase auth.signInWithPassword() succeeds - returns valid user + session
- Profile exists in database for this user (verified via direct Supabase query)
- RLS policies allow authenticated users to read their own profile

## The Code

### AuthContext.tsx
```tsx
// https://github.com/anthropics/claude-code - blob/main/Omniscience/contexts/AuthContext.tsx

// Simplified version that should work but profile never gets set:
async function fetchProfile(supabase, userId) {
  // Tries to refresh session first (doesn't block on this)
  supabase.auth.refreshSession().catch(e => console.log('refresh error:', e))

  // Then tries to fetch profile - THIS ALWAYS RETURNS NULL
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  console.log('Profile result:', data, error) // data is null, error is null
  return data
}

// onAuthStateChange handler:
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_IN' && session?.user) {
    setUser(session.user)
    const profileData = await fetchProfile(supabase, session.user.id)
    setProfile(profileData) // This sets null!
  }
})
```

### middleware.ts (line 32)
```tsx
// Uses createServerClient with cookie handling
const { data: { user } } = await supabase.auth.getUser()
// This DOES work - user is authenticated
```

### Supabase Client (lib/supabase/client.ts)
```ts
// Uses createBrowserClient from @supabase/ssr
export function createSupabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

## Things We've Tried
1. Using window.location.href instead of router.push (didn't help)
2. Adding session refresh before profile fetch (still returns null)
3. Adding timeouts/delays (doesn't help)
4. Removing test mode bypass (was working before)
5. The login form uses createSupabaseBrowser() which is the same client

## What's Weird
- The auth state changes to SIGNED_IN
- getUser() works in middleware
- But profile fetch in browser returns null with NO error
- Same Supabase client works in other parts of the app

## What I Need
- Why does profile fetch return null with no error?
- Is there a difference between how middleware gets user vs browser client?
- Is the session token being passed correctly in the browser?
