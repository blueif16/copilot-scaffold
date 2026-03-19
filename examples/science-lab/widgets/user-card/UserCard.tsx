"use client";

interface UserCardProps {
  username: string;
  age: number;
  widgetId: string;
}

export default function UserCard({ username, age }: UserCardProps) {
  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="h-14 w-14 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center text-white text-xl font-bold">
          {username.charAt(0).toUpperCase()}
        </div>
        <div>
          <h3 className="text-lg font-semibold">{username}</h3>
          <p className="text-sm text-muted-foreground">Age: {age}</p>
        </div>
      </div>
    </div>
  );
}
