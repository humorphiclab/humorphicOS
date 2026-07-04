"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { authApi, setStoredTokens, setStoredUser } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { tokens, user } = await authApi.login(email, password);
      setStoredTokens(tokens);
      setStoredUser(user);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex rounded-xl bg-primary p-3 mb-4">
            <Bot className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Welcome to HumorphicOS</h1>
          <p className="text-muted mt-2">Sign in to your club workspace</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-card-border bg-card p-6 space-y-4"
        >
          {error && (
            <div className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@college.edu"
              required
            />
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </Button>

          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-card-border" /></div>
            <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted">or</span></div>
          </div>

          <Button type="button" variant="secondary" className="w-full" onClick={() => alert("Set GOOGLE_CLIENT_ID in .env and integrate Google Sign-In SDK")}>
            Continue with Google
          </Button>

          <p className="text-center text-sm text-muted">
            No account?{" "}
            <Link href="/register" className="text-primary hover:underline">
              Register
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
