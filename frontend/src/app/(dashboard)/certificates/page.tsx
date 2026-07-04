"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TopBar } from "@/components/layout/sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { certificatesApi } from "@/lib/api";
import { Award } from "lucide-react";

export default function CertificatesPage() {
  const { data: certs } = useQuery({ queryKey: ["certificates"], queryFn: certificatesApi.list });
  const [code, setCode] = useState("");
  const [verifyResult, setVerifyResult] = useState<{ valid: boolean; title?: string; recipient?: string } | null>(null);

  const verify = async () => {
    try {
      const result = await certificatesApi.verify(code);
      setVerifyResult(result);
    } catch {
      setVerifyResult({ valid: false });
    }
  };

  return (
    <>
      <TopBar title="Certificates" />
      <div className="p-6 space-y-6">
        <Card>
          <h3 className="font-semibold mb-3">Verify Certificate</h3>
          <div className="flex gap-2">
            <Input placeholder="Enter verification code" value={code} onChange={(e) => setCode(e.target.value)} />
            <Button onClick={verify}>Verify</Button>
          </div>
          {verifyResult && (
            <div className={`mt-3 text-sm ${verifyResult.valid ? "text-success" : "text-danger"}`}>
              {verifyResult.valid
                ? `Valid: ${verifyResult.title} — ${verifyResult.recipient}`
                : "Invalid verification code."}
            </div>
          )}
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(certs ?? []).map((c) => (
            <Card key={c.id}>
              <div className="flex items-center gap-3">
                <Award className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-medium">{c.title}</p>
                  <p className="text-xs text-muted">{c.event_name}</p>
                  <p className="text-xs text-muted mt-1">Code: {c.verification_code}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
