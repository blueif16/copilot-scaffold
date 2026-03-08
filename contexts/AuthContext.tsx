"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User } from "@supabase/supabase-js";
import { createSupabaseBrowser } from "@/lib/supabase/client";

interface Profile {
  id: string;
  role: "student" | "teacher";
  display_name: string | null;
  avatar_url: string | null;
  letta_agent_id: string | null;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function fetchProfile(userId: string, accessToken: string): Promise<Profile | null> {
  console.log("[slice-8-auth] fetchProfile called for:", userId);

  // Use direct API to avoid Supabase client lock issues
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=*`,
    {
      headers: {
        "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        "Authorization": `Bearer ${accessToken}`,
      },
    }
  );

  const data = await response.json();
  console.log("[slice-8-auth] Profile result:", data);

  if (!data || data.length === 0) {
    console.error("[slice-8-auth] Profile fetch error: not found");
    return null;
  }

  return data[0];
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createSupabaseBrowser();

  // Initialize auth - only use onAuthStateChange to avoid race conditions with login
  useEffect(() => {
    // Check for tokens in sessionStorage (set by login page) and set them in the client
    const accessToken = sessionStorage.getItem("sb-access-token");
    const refreshToken = sessionStorage.getItem("sb-refresh-token");

    if (accessToken && refreshToken) {
      console.log("[slice-8-auth] Found tokens in sessionStorage, setting session...");
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      }).then(() => {
        sessionStorage.removeItem("sb-access-token");
        sessionStorage.removeItem("sb-refresh-token");
      });
    }

    // Listen for auth changes - this handles both INITIAL_SESSION and SIGNED_IN
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("[slice-8-auth] Event:", event, "session:", session ? "yes" : "no");

        if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session?.user) {
          console.log("[slice-8-auth] Setting user, fetching profile...");
          setUser(session.user);
          try {
            const profileData = await fetchProfile(session.user.id, session.access_token);
            console.log("[slice-8-auth] Profile fetched:", profileData);
            setProfile(profileData);
          } catch (err) {
            console.error("[slice-8-auth] fetchProfile exception:", err);
          }
        } else if (event === "SIGNED_OUT") {
          setUser(null);
          setProfile(null);
        }

        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
