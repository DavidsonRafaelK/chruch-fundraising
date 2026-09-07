"use client";

import Script from "next/script";
import { useId, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
        },
      ) => string;
      reset: (widgetId?: string) => void;
    };
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export function TurnstileWidget({
  onVerify,
}: {
  onVerify: (token: string | null) => void;
}) {
  const containerId = useId().replace(/:/g, "");
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const [scriptReady, setScriptReady] = useState(false);

  function render() {
    if (!window.turnstile || !containerRef.current || widgetId.current) {
      return;
    }
    widgetId.current = window.turnstile.render(containerRef.current, {
      sitekey: SITE_KEY ?? "",
      callback: (token) => onVerify(token),
      "expired-callback": () => onVerify(null),
      "error-callback": () => onVerify(null),
    });
  }

  if (!SITE_KEY) {
    console.error(
      "NEXT_PUBLIC_TURNSTILE_SITE_KEY is not set — the order form cannot be verified.",
    );
    return (
      <p className="text-sm text-destructive">
        Verification is unavailable right now. Please try again later.
      </p>
    );
  }

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="afterInteractive"
        onReady={() => {
          setScriptReady(true);
          render();
        }}
      />
      <div id={containerId} ref={containerRef} data-ready={scriptReady} />
    </>
  );
}
