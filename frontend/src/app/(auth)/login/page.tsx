"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { GoogleSignIn } from "@/components/auth/google-sign-in";
import { authApi, setStoredTokens, setStoredUser } from "@/lib/api";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const finishLogin = async (loginFn: () => Promise<{ tokens: { access: string; refresh: string }; user: unknown }>) => {
    setError("");
    setLoading(true);
    try {
      const { tokens, user } = await loginFn();
      setStoredTokens(tokens);
      setStoredUser(user as Parameters<typeof setStoredUser>[0]);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    finishLogin(() => authApi.login(email, password));
  };

  const handleGoogle = (idToken: string) => {
    finishLogin(() => authApi.googleLogin(idToken));
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

        <form onSubmit={handleSubmit} className="rounded-xl border border-card-border bg-card p-6 space-y-4">
          {error && (
            <div className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}

          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@college.edu" required />
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </Button>

          {GOOGLE_CLIENT_ID && (
            <>
              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-card-border" /></div>
                <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted">or</span></div>
              </div>
              <GoogleSignIn clientId={GOOGLE_CLIENT_ID} onSuccess={handleGoogle} onError={() => setError("Google sign-in failed")} />
            </>
          )}

          <p className="text-center text-sm text-muted">
            Demo: <span className="text-foreground">president@humorphic.club</span> / <span className="text-foreground">Demo@12345</span>
          </p>

          <p className="text-center text-sm text-muted">
            No account? <Link href="/register" className="text-primary hover:underline">Register</Link>
            {" · "}
            <Link href="/portal" className="text-primary hover:underline">Public Portal</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
