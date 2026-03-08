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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createSupabaseBrowser();

  // Normal auth flow
  useEffect(() => {
    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        setUser(currentUser);

        if (currentUser) {
          // Fetch profile data
          const { data: profileData, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", currentUser.id)
            .single();

          if (error) {
            console.error("[slice-8-auth] Error fetching profile:", error);
          } else {
            setProfile(profileData);
          }
        }
      } catch (error) {
        console.error("[slice-8-auth] Error initializing auth:", error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          console.log("[slice-8-auth] Auth state changed, fetching profile for:", currentUser.email);

          // Check cookies
          const cookies = document.cookie;
          console.log("[slice-8-auth] Cookies length:", cookies.length);
          console.log("[slice-8-auth] Cookie value sample:", cookies.substring(0, 200));

          // Wait for cookie to fully propagate
          await new Promise(r => setTimeout(r, 500));

          // Try to refresh the token explicitly
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          console.log("[slice-8-auth] Refresh result:", refreshData?.session ? "success" : "failed", refreshError);

          // Get session again
          const { data: { session: freshSession } } = await supabase.auth.getSession();
          console.log("[slice-8-auth] Fresh session:", freshSession ? "valid with user: " + freshSession.user?.email : "null");
          console.log("[slice-8-auth] Access token first 50 chars:", freshSession?.access_token?.substring(0, 50));

          try {
            // Fetch profile with timeout
            const fetchPromise = supabase
              .from("profiles")
              .select("*")
              .eq("id", currentUser.id)
              .single();

            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error("Profile fetch timeout")), 5000)
            );

            const result = await Promise.race([fetchPromise, timeoutPromise]) as any;
            const { data: profileData, error } = result;

            console.log("[slice-8-auth] Profile result:", profileData, error);

            if (error) {
              console.error("[slice-8-auth] Error fetching profile:", error);
              setProfile(null);
            } else if (profileData) {
              console.log("[slice-8-auth] Profile fetched:", profileData);
              setProfile(profileData);
            } else {
              console.error("[slice-8-auth] No profile data and no error!");
              setProfile(null);
            }
          } catch (err: any) {
            console.error("[slice-8-auth] Profile fetch failed:", err.message);
            setProfile(null);
          }
        } else {
          console.log("[slice-8-auth] No user, clearing profile");
          setProfile(null);
        }

        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
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
