import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="card-chunky max-w-md w-full p-8 text-center">
        <span className="text-6xl mb-4 block">🔭</span>
        <h2 className="font-display text-3xl font-bold mb-3">
          Page not found
        </h2>
        <p className="font-body text-sm text-ink/60 mb-6">
          Looks like this corner of the universe hasn&apos;t been discovered yet.
        </p>
        <Link href="/" className="btn-chunky bg-playful-sky inline-block">
          Back to topics
        </Link>
      </div>
    </main>
  );
}
