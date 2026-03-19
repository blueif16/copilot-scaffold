"use client";

interface UserCardProps {
  username: string;
  age: number;
  widgetId: string;
}

export default function UserCard({ username, age }: UserCardProps) {
  // Derive some display values from the props — the orchestrator just
  // passes username and age, everything else is cosmetic.
  const initial = username.charAt(0).toUpperCase();
  const memberYear = new Date().getFullYear() - 1; // cosmetic default

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
      <div className="flex items-center gap-4">
        <div className="h-14 w-14 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center text-white text-xl font-bold shrink-0">
          {initial}
        </div>
        <div>
          <h3 className="text-lg font-semibold">{username}</h3>
          <p className="text-sm text-muted-foreground">Age: {age}</p>
          <p className="text-xs text-muted-foreground">
            Member since {memberYear}
          </p>
        </div>
      </div>
      <div className="flex gap-6 text-sm text-muted-foreground">
        <span>3 labs explored</span>
        <span>2 milestones</span>
      </div>
    </div>
  );
}
