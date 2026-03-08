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

async function fetchProfile(supabase: ReturnType<typeof createSupabaseBrowser>, userId: string): Promise<Profile | null> {
  console.log("[slice-8-auth] fetchProfile called for:", userId);

  // Try to refresh the session first
  try {
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    console.log("[slice-8-auth] Refresh result:", refreshError ? "error" : "success", refreshData?.session ? "has session" : "no session");
  } catch (err) {
    console.error("[slice-8-auth] Refresh exception:", err);
  }

  // Now fetch the profile
  console.log("[slice-8-auth] Fetching profile...");
  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  console.log("[slice-8-auth] Profile result:", profileError || profileData);

  if (profileError) {
    console.error("[slice-8-auth] Profile fetch error:", profileError);
    return null;
  }

  return profileData;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createSupabaseBrowser();

  // Initialize auth
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Get initial session
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          setUser(session.user);
          const profileData = await fetchProfile(supabase, session.user.id);
          setProfile(profileData);
        }
      } catch (error) {
        console.error("[slice-8-auth] Init error:", error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("[slice-8-auth] Event:", event, "session:", session ? "yes" : "no");

        if (event === "SIGNED_IN" && session?.user) {
          console.log("[slice-8-auth] Setting user, fetching profile...");
          setUser(session.user);
          try {
            const profileData = await fetchProfile(supabase, session.user.id);
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
