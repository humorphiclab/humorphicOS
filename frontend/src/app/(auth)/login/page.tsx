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

  const finishLogin = async (
    loginFn: () => Promise<{ tokens: { access: string; refresh: string }; user: unknown }>
  ) => {
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
    <div className="min-h-screen flex w-full bg-background">
      {/* ── Left pane – branding ── */}
      <aside className="hidden lg:flex w-[45%] flex-col justify-between relative overflow-hidden">
        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('/robotimagelogin.jpg')",
          }}
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/50 to-primary/40" />

        {/* Top logo */}
        <div className="relative z-10 p-10">
          <div className="flex items-center gap-3">
            <div className="inline-flex rounded-xl bg-primary p-2.5">
              <Bot className="h-7 w-7 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight text-white">HumorphicOS</span>
          </div>
        </div>

        {/* Bottom tagline */}
        <div className="relative z-10 p-10 pb-14">
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            Welcome back,<br />builder.
          </h2>
          <p className="text-white/70 text-base leading-relaxed max-w-sm">
            Sign in to your workspace to continue building, collaborating and growing with the club.
          </p>
          {/* decorative dots */}
          <div className="flex gap-2 mt-8">
            <span className="h-2 w-8 rounded-full bg-primary" />
            <span className="h-2 w-2 rounded-full bg-white/30" />
            <span className="h-2 w-2 rounded-full bg-white/30" />
          </div>
        </div>
      </aside>

      {/* ── Right pane – form ── */}
      <main className="flex-1 flex items-center justify-center px-6 sm:px-12">
        <div className="w-full max-w-md">
          {/* Mobile-only logo */}
          <div className="flex lg:hidden items-center gap-2 mb-8">
            <div className="inline-flex rounded-xl bg-primary p-2">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">HumorphicOS</span>
          </div>

          <h1 className="text-3xl font-bold mb-1">Sign in</h1>
          <p className="text-sm text-muted-foreground mb-8">
            No account?{" "}
            <Link href="/register" className="text-primary font-medium hover:underline">
              Create one
            </Link>
            {" · "}
            <Link href="/portal" className="text-primary font-medium hover:underline">
              Public Portal
            </Link>
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive font-medium">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@college.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-background px-4 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            {GOOGLE_CLIENT_ID ? (
              <div className="flex items-center justify-center overflow-hidden h-11">
                <GoogleSignIn
                  clientId={GOOGLE_CLIENT_ID}
                  onSuccess={handleGoogle}
                  onError={() => setError("Google sign-in failed")}
                />
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="w-full h-11"
                onClick={() =>
                  alert("Pleasee configure NEXT_PUBLIC_GOOGLE_CLIENT_ID to enable Google Sign-In.")
                }
              >
                Google
              </Button>
            )}

            <p className="text-center text-xs text-muted-foreground pt-2">
              {" "}
              <span className="text-foreground font-medium"></span>{" "}
              {" "}
              <span className="text-foreground font-medium"></span>
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}
