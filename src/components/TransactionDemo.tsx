"use client";

import { useState, useCallback } from "react";
import { useSolana, usePhantom } from "@phantom/react-sdk";
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";

/**
 * TransactionDemo - Demonstrates embedded wallet transaction capabilities
 * 
 * The login itself verifies ownership (OAuth proves identity).
 * This demo shows seamless one-click transactions - no extension popups!
 * 
 * @see https://docs.phantom.com/sdks/react-sdk/sign-and-send-transaction
 */
export default function TransactionDemo() {
  const { solana, isAvailable } = useSolana();
  const { isConnected } = usePhantom();

  // UI state
  const [isSendingTx, setIsSendingTx] = useState(false);
  const [result, setResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Clear result after 5 seconds
  const showResult = useCallback((type: "success" | "error", message: string) => {
    setResult({ type, message });
    setTimeout(() => setResult(null), 5000);
  }, []);

  /**
   * Send SOL - Demonstrates one-click payments
   * Sends to SELF for safety (only loses ~0.000005 SOL tx fee)
   */
  const handleSendTransaction = useCallback(async () => {
    if (!isAvailable || !solana?.signAndSendTransaction) {
      showResult("error", "Please wait for wallet to initialize...");
      return;
    }

    setIsSendingTx(true);
    try {
      const publicKey = await solana.getPublicKey();
      const userPubkey = new PublicKey(publicKey);

      // Connect to Solana - RPC URL must be set in env
      const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
      if (!rpcUrl) {
        throw new Error("NEXT_PUBLIC_SOLANA_RPC_URL not configured");
      }
      const connection = new Connection(rpcUrl);
      const { blockhash } = await connection.getLatestBlockhash();

      // Create transfer (to self for demo safety)
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: userPubkey,
          toPubkey: userPubkey, // Safe: returns to same wallet
          lamports: 0.001 * LAMPORTS_PER_SOL,
        })
      );
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = userPubkey;

      // Sign and send in one step - the embedded wallet magic!
      const txResult = await solana.signAndSendTransaction(transaction);
      
      console.log("✅ Transaction sent:", txResult);
      const txId = txResult.signature || txResult.hash || "";
      showResult("success", `✓ Sent! TX: ${txId.slice(0, 16)}...`);
    } catch (error) {
      console.error("❌ Transaction error:", error);
      showResult("error", error instanceof Error ? error.message : "Transaction failed");
    } finally {
      setIsSendingTx(false);
    }
  }, [solana, isAvailable, showResult]);

  // Don't show if not connected
  if (!isConnected) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-ink">
        Send Transaction
      </h3>
      
      <p className="text-sm text-text-muted">
        One-click transactions with no browser extension required.
      </p>

      {/* Send Transaction Button */}
      <button
        onClick={handleSendTransaction}
        disabled={!isAvailable || isSendingTx}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand text-white rounded-lg font-medium hover:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {isSendingTx ? (
          <>
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Sending...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Send 0.001 SOL
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
          {result.message}
        </div>
      )}
      
      {/* Info footer */}
      <p className="text-xs text-text-muted">
        💡 Demo sends SOL to yourself (only tx fee ~$0.001 lost)
      </p>
    </div>
  );
}
