"use client";

import { useState } from "react";
import Link from "next/link";
import { Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { certificatesApi } from "@/lib/api";

export default function VerifyCertificatePage() {
  const [code, setCode] = useState("");
  const [result, setResult] = useState<Awaited<ReturnType<typeof certificatesApi.verify>> | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await certificatesApi.verify(code.trim());
      setResult(data);
    } catch {
      setError("Certificate not found or invalid code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-card-border px-6 py-4 flex items-center justify-between">
        <Link href="/portal" className="flex items-center gap-2">
          <div className="rounded-lg bg-primary p-2"><Bot className="h-5 w-5 text-white" /></div>
          <span className="font-bold">HumorphicOS</span>
        </Link>
        <Link href="/login"><Button size="sm" variant="secondary">Sign In</Button></Link>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-bold text-center mb-2">Verify Certificate</h1>
          <p className="text-muted text-center text-sm mb-6">Enter the verification code from your certificate</p>

          <form onSubmit={verify} className="rounded-xl border border-card-border bg-card p-6 space-y-4">
            <div>
              <Label htmlFor="code">Verification Code</Label>
              <Input id="code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="ABC123XYZ" required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>{loading ? "Verifying..." : "Verify"}</Button>
          </form>

          {error && <p className="text-danger text-sm text-center mt-4">{error}</p>}

          {result?.valid && (
            <div className="mt-6 rounded-xl border border-success/30 bg-success/10 p-6 text-center">
              <p className="text-success font-semibold mb-2">Valid Certificate</p>
              <p className="font-medium">{result.title}</p>
              <p className="text-sm text-muted mt-2">Recipient: {result.recipient}</p>
              {result.event_name && <p className="text-sm text-muted">Event: {result.event_name}</p>}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
