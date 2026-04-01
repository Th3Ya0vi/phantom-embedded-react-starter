"use client";

import { usePhantom, ConnectBox } from "@phantom/react-sdk";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * OAuth Callback Page
 * 
 * Phantom Connect SDK v1.0.7
 * 
 * Uses the SDK's ConnectBox component which automatically handles all
 * connection states: loading, error, and success during the auth callback flow.
 * 
 * ConnectBox renders inline (no modal backdrop) and manages the entire
 * OAuth callback lifecycle — no manual state management needed.
 * 
 * @see https://docs.phantom.com/sdks/react-sdk/connect
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const { isConnected } = usePhantom();

  // Redirect to home once connected
  useEffect(() => {
    if (isConnected) {
      const timer = setTimeout(() => {
        router.push("/");
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isConnected, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-page">
      <div className="flex flex-col items-center gap-6 p-8">
        <h1 className="text-lg font-semibold text-ink">
          Completing sign in...
        </h1>
        <ConnectBox maxWidth="400px" />
      </div>
    </div>
  );
}
