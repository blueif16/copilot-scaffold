"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { useLocale } from "@/contexts/LocaleContext";

export default function LoginPage() {
  const router = useRouter();
  const { t, locale, setLocale } = useLocale();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createSupabaseBrowser();

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        console.error("[slice-8-auth] Login error:", signInError);
        setError(t.loginError);
        setLoading(false);
        return;
      }

      if (data.user) {
        // Redirect to home page
        router.push("/");
        router.refresh();
      }
    } catch (err) {
      console.error("[slice-8-auth] Unexpected error:", err);
      setError(t.loginError);
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-md"
    >
      {/* Language Toggle */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setLocale(locale === "en" ? "zh" : "en")}
          className="px-3 py-1.5 text-sm font-medium text-ink/60 hover:text-ink transition-colors"
        >
          {locale === "en" ? "中文" : "EN"}
        </button>
      </div>

      {/* Login Card */}
      <div className="bg-white border-4 border-ink rounded-chunky shadow-chunky p-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <img
            src="/assets/beaker.png"
            alt=""
            className="w-10 h-10 object-contain"
          />
          <h1 className="font-display text-3xl font-bold tracking-tight">
            {t.welcomeBack}
          </h1>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="block font-body text-sm font-medium text-ink mb-2"
            >
              {t.email}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border-3 border-ink rounded-lg font-body text-base focus:outline-none focus:ring-2 focus:ring-playful-sky"
              placeholder="you@example.com"
            />
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="block font-body text-sm font-medium text-ink mb-2"
            >
              {t.password}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 border-3 border-ink rounded-lg font-body text-base focus:outline-none focus:ring-2 focus:ring-playful-sky"
              placeholder="••••••••"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border-2 border-red-400 rounded-lg p-3">
              <p className="font-body text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-playful-sky border-3 border-ink rounded-lg px-6 py-3 font-body font-semibold text-ink shadow-chunky-sm hover:shadow-chunky hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "..." : t.loginButton}
          </button>
        </form>

        {/* Signup Link */}
        <div className="mt-6 text-center">
          <p className="font-body text-sm text-ink/60">
            {t.noAccount}{" "}
            <Link
              href="/signup"
              className="text-playful-sky font-semibold hover:underline"
            >
              {t.signup}
            </Link>
          </p>
        </div>
      </div>
    </motion.div>
  );
}
