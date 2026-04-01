"use client";

import { useState, useCallback } from "react";
import { useSolana, usePhantom } from "@phantom/react-sdk";
import bs58 from "bs58";

/**
 * SignMessageDemo - Demonstrates message signing capabilities
 * 
 * Phantom Connect SDK v1.0.7
 * 
 * This component allows users to sign a message with their wallet.
 * Message signing is useful for authentication and proving wallet ownership.
 * 
 * @see https://docs.phantom.com/sdks/react-sdk
 */
export default function SignMessageDemo() {
  const { solana, isAvailable } = useSolana();
  const { isConnected } = usePhantom();

  // UI state
  const [isSigning, setIsSigning] = useState(false);
  const [result, setResult] = useState<{
    type: "success" | "error";
    message: string;
    signature?: string;
  } | null>(null);

  // Default message to sign
  const defaultMessage = "Hello from Phantom Embedded Wallet!";

  // Clear result after 5 seconds
  const showResult = useCallback((type: "success" | "error", message: string, signature?: string) => {
    setResult({ type, message, signature });
    setTimeout(() => setResult(null), 5000);
  }, []);

  /**
   * Sign Message - Demonstrates message signing
   * Signs a message string with the wallet
   */
  const handleSignMessage = useCallback(async () => {
    if (!isAvailable || !solana?.signMessage) {
      showResult("error", "Please wait for wallet to initialize...");
      return;
    }

    setIsSigning(true);
    try {
      // Sign the message using Phantom embedded wallet
      // Returns { signature: Uint8Array, publicKey: string }
      const signResult = await solana.signMessage(defaultMessage);

      console.log("✅ Message signed:", signResult);

      // Encode the signature as base58 for proper display
      const signatureBase58 = bs58.encode(signResult.signature);

      showResult(
        "success",
        `✓ Message signed successfully!`,
        signatureBase58.slice(0, 44) + "..."
      );
    } catch (error) {
      console.error("❌ Sign message error:", error);
      showResult("error", error instanceof Error ? error.message : "Failed to sign message");
    } finally {
      setIsSigning(false);
    }
  }, [solana, isAvailable, defaultMessage, showResult]);

  // Don't show if not connected
  if (!isConnected) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-ink">
        Sign Message
      </h3>
      
      <p className="text-sm text-text-muted">
        Sign a message to prove wallet ownership and authenticate.
      </p>

      {/* Message Preview */}
      <div className="p-3 bg-gray-100 rounded-lg border border-gray-200">
        <p className="text-xs text-muted mb-1">Message to sign:</p>
        <p className="text-sm font-mono text-ink break-words">
          {defaultMessage}
        </p>
      </div>

      {/* Sign Message Button */}
      <button
        onClick={handleSignMessage}
        disabled={!isAvailable || isSigning}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand text-white rounded-lg font-medium hover:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {isSigning ? (
          <>
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Signing...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            Sign Message
          </>
        )}
      </button>

      {/* Result message */}
      {result && (
        <div
          className={`p-3 rounded-lg text-sm ${
            result.type === "success"
              ? "bg-green/10 text-green"
              : "bg-orange/10 text-orange"
          }`}
        >
          <p>{result.message}</p>
          {result.signature && (
            <p className="mt-2 text-xs font-mono break-all opacity-80">
              Signature: {result.signature}
            </p>
          )}
        </div>
      )}
      
      {/* Info footer */}
      <p className="text-xs text-text-muted">
        💡 Message signing proves wallet ownership without sending a transaction
      </p>
    </div>
  );
}
