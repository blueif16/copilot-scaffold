"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";

interface MemoryBlock {
  label: string;
  value: string;
}

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [memory, setMemory] = useState<MemoryBlock[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const supabase = createSupabaseBrowser();

        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!user) {
          setError("Not authenticated");
          setLoading(false);
          return;
        }

        // Fetch profile
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (profileError) throw profileError;
        setProfile(profileData);

        // Fetch memory if agent exists
        if (profileData?.letta_agent_id) {
          const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8123";
          const { data: { session } } = await supabase.auth.getSession();

          const response = await fetch(`${backendUrl}/api/students/${user.id}/memory`, {
            headers: {
              Authorization: `Bearer ${session?.access_token}`,
            },
          });

          if (response.ok) {
            const memoryData = await response.json();
            setMemory([
              { label: "Profile", value: memoryData.student_profile || "No data yet" },
              { label: "Learning Style", value: memoryData.learning_style || "No data yet" },
              { label: "Knowledge State", value: memoryData.knowledge_state || "No data yet" },
              { label: "Interests", value: memoryData.interests || "No data yet" },
            ]);
          }
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading profile...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">My Profile</h1>

        {/* Profile Info */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Account Information</h2>
          <div className="space-y-2">
            <div>
              <span className="font-medium">Display Name:</span>{" "}
              {profile?.display_name || "Not set"}
            </div>
            <div>
              <span className="font-medium">Role:</span> {profile?.role || "student"}
            </div>
            <div>
              <span className="font-medium">Memory Agent:</span>{" "}
              {profile?.letta_agent_id ? (
                <span className="text-green-600">Active</span>
              ) : (
                <span className="text-gray-500">Not created</span>
              )}
            </div>
          </div>
        </div>

        {/* Memory Blocks */}
        {profile?.letta_agent_id && memory.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">What I Remember About You</h2>
            <div className="space-y-4">
              {memory.map((block) => (
                <div key={block.label} className="border-l-4 border-blue-500 pl-4">
                  <h3 className="font-semibold text-gray-700 mb-1">{block.label}</h3>
                  <p className="text-gray-600 whitespace-pre-wrap">{block.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Memory Agent */}
        {!profile?.letta_agent_id && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-2">Memory Agent Not Set Up</h2>
            <p className="text-gray-700">
              Your personalized learning companion hasn't been created yet.
              Complete a learning session to activate your memory agent!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
