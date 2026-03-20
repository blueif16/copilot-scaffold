export default function RedFlower() {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] w-full items-center justify-center bg-gradient-to-b from-rose-50 to-white dark:from-rose-950 dark:to-background">
      <svg
        viewBox="0 0 200 220"
        width="60vw"
        style={{ maxWidth: 600, maxHeight: "70vh" }}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Stem */}
        <path d="M100 220 Q95 170 100 140" stroke="#4a7c3f" strokeWidth="5" fill="none" strokeLinecap="round" />
        {/* Leaves */}
        <path d="M100 185 Q75 165 65 145 Q85 158 100 165" fill="#5a9e4a" />
        <path d="M100 175 Q125 155 135 135 Q115 148 100 155" fill="#5a9e4a" />
        {/* Outer petals */}
        <ellipse cx="100" cy="72" rx="18" ry="38" fill="#c0152a" transform="rotate(-40 100 100)" opacity="0.85" />
        <ellipse cx="100" cy="72" rx="18" ry="38" fill="#c0152a" transform="rotate(0 100 100)" opacity="0.85" />
        <ellipse cx="100" cy="72" rx="18" ry="38" fill="#c0152a" transform="rotate(40 100 100)" opacity="0.85" />
        <ellipse cx="100" cy="72" rx="18" ry="38" fill="#d42030" transform="rotate(-80 100 100)" opacity="0.85" />
        <ellipse cx="100" cy="72" rx="18" ry="38" fill="#d42030" transform="rotate(80 100 100)" opacity="0.85" />
        {/* Inner petals */}
        <ellipse cx="100" cy="80" rx="13" ry="26" fill="#e8293c" transform="rotate(-20 100 100)" />
        <ellipse cx="100" cy="80" rx="13" ry="26" fill="#e8293c" transform="rotate(20 100 100)" />
        <ellipse cx="100" cy="80" rx="13" ry="26" fill="#e8293c" transform="rotate(60 100 100)" />
        <ellipse cx="100" cy="80" rx="13" ry="26" fill="#e8293c" transform="rotate(-60 100 100)" />
        {/* Center */}
        <circle cx="100" cy="100" r="16" fill="#9b0f20" />
        <circle cx="100" cy="100" r="9" fill="#c41428" />
        <circle cx="100" cy="100" r="4" fill="#ffd700" />
      </svg>
    </div>
  );
}
