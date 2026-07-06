"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          renderButton: (el: HTMLElement, config: Record<string, unknown>) => void;
        };
      };
    };
  }
}

interface GoogleSignInProps {
  clientId: string;
  onSuccess: (idToken: string) => void;
  onError?: () => void;
}

export function GoogleSignIn({ clientId, onSuccess, onError }: GoogleSignInProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!clientId || !ref.current) return;

    const init = () => {
      if (!window.google) return;
      
      if (!(window as any)._gsiInitialized) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response: { credential: string }) => onSuccess(response.credential),
        });
        (window as any)._gsiInitialized = true;
      }
      
      if (ref.current) {
        window.google.accounts.id.renderButton(ref.current, {
          theme: "outline",
          size: "large",
          width: ref.current.offsetWidth || 320,
        });
      }
    };

    if (window.google) {
      init();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = init;
    script.onerror = () => onError?.();
    document.body.appendChild(script);
  }, [clientId, onSuccess, onError]);

  if (!clientId) return null;
  return <div ref={ref} className="w-full flex justify-center" />;
}
