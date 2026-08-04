"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Mode = "login" | "signup";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/ops";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    const supabase = createClient();
    try {
      if (mode === "signup") {
        const origin = window.location.origin;
        const { error: signError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
          },
        });
        if (signError) {
          setError(signError.message);
          return;
        }
        setMessage(
          "Check your email to confirm, or sign in if confirmations are disabled.",
        );
        router.push(`/login?next=${encodeURIComponent(next)}`);
        router.refresh();
        return;
      }

      const { error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (loginError) {
        setError(loginError.message);
        return;
      }
      router.push(next);
      router.refresh();
    } catch {
      setError("Auth request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 max-w-md w-full">
      <label className="block">
        <span className="text-sm text-muted">Email</span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full border border-line bg-surface px-3 py-2"
        />
      </label>
      <label className="block">
        <span className="text-sm text-muted">Password</span>
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full border border-line bg-surface px-3 py-2"
        />
      </label>
      {error && <p className="text-sm text-danger">{error}</p>}
      {message && <p className="text-sm text-ok">{message}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-full bg-sea py-3 text-white font-medium disabled:opacity-40"
      >
        {loading ? "…" : mode === "login" ? "Sign in" : "Create account"}
      </button>
      <p className="text-sm text-muted text-center">
        {mode === "login" ? (
          <>
            No account?{" "}
            <Link href="/signup" className="text-sea underline-offset-2 hover:underline">
              Sign up
            </Link>
          </>
        ) : (
          <>
            Already registered?{" "}
            <Link href="/login" className="text-sea underline-offset-2 hover:underline">
              Sign in
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
