"use client";

import { useState, useCallback } from "react";
import { useSolana, usePhantom } from "@phantom/react-sdk";
import {
  createSolanaRpc,
  address,
} from "@solana/kit";
import {
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";

/**
 * CustomTransferDemo - Transfer SOL to a custom address using @solana/kit
 * 
 * This component allows you to send SOL to a specific address.
 * Uses @solana/kit RPC client for blockchain interactions.
 */
export default function CustomTransferDemo() {
  const { solana, isAvailable } = useSolana();
  const { isConnected } = usePhantom();

  // Default destination address
  const DEFAULT_DESTINATION = "4hesbhr1zKz5Pmy7FQvJD5fETCNNa3T2CE6qS9q5Dmsq";
  
  // UI state
  const [isSendingTx, setIsSendingTx] = useState(false);
  const [destinationAddress, setDestinationAddress] = useState(DEFAULT_DESTINATION);
  const [transferAmount, setTransferAmount] = useState("0.001");
  const [result, setResult] = useState<{
    type: "success" | "error";
    message: string;
    signature?: string;
  } | null>(null);

  // Clear result after 10 seconds
  const showResult = useCallback((type: "success" | "error", message: string, signature?: string) => {
    setResult({ type, message, signature });
    setTimeout(() => setResult(null), 10000);
  }, []);

  /**
   * Send SOL to the specified destination address
   */
  const handleSendTransaction = useCallback(async () => {
    if (!isAvailable || !solana?.signAndSendTransaction) {
      showResult("error", "Please wait for wallet to initialize...");
      return;
    }

    // Validate destination address
    try {
      new PublicKey(destinationAddress);
    } catch {
      showResult("error", "Invalid destination address");
      return;
    }

    // Validate amount
    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || amount <= 0) {
      showResult("error", "Please enter a valid amount");
      return;
    }

    setIsSendingTx(true);
    try {
      const publicKey = solana.publicKey;
      if (!publicKey) {
        throw new Error("Wallet not connected or public key unavailable");
      }
      const userPubkey = new PublicKey(publicKey);
      const destinationPubkey = new PublicKey(destinationAddress);

      // Get RPC URL from environment
      const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
      
      // Create RPC client using @solana/kit
      const rpc = createSolanaRpc(rpcUrl);
      
      // Get latest blockhash using @solana/kit
      const latestBlockhashResponse = await rpc.getLatestBlockhash().send();
      const latestBlockhash = latestBlockhashResponse.value;

      // Create transfer transaction
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: userPubkey,
          toPubkey: destinationPubkey,
          lamports: amount * LAMPORTS_PER_SOL,
        })
      );
      transaction.recentBlockhash = latestBlockhash.blockhash;
      transaction.feePayer = userPubkey;

      // Sign and send transaction
      const txResult = await solana.signAndSendTransaction(transaction);
      
      console.log("✅ Transaction sent:", txResult);
      const txId = txResult.signature || "";
      showResult("success", `✓ Sent ${transferAmount} SOL! TX: ${txId.slice(0, 16)}...`, txId);
    } catch (error) {
      console.error("❌ Transaction error:", error);
      showResult("error", error instanceof Error ? error.message : "Transaction failed");
    } finally {
      setIsSendingTx(false);
    }
  }, [solana, isAvailable, destinationAddress, transferAmount, showResult]);


  // Don't show if not connected
  if (!isConnected) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-ink">
        Custom Transfer (@solana/kit)
      </h3>
      
      <p className="text-sm text-text-muted">
        Send SOL to a custom address using @solana/kit RPC client.
      </p>

      {/* Destination Address Input */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-ink">
          Destination Address
        </label>
        <input
          type="text"
          value={destinationAddress}
          onChange={(e) => setDestinationAddress(e.target.value)}
          placeholder="Enter Solana address"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-ink bg-bg-surface focus:outline-none focus:ring-2 focus:ring-brand"
        />
        <button
          onClick={() => setDestinationAddress(DEFAULT_DESTINATION)}
          className="text-xs text-link hover:underline"
        >
          Use default: {DEFAULT_DESTINATION.slice(0, 8)}...
        </button>
      </div>

      {/* Amount Input */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-ink">
          Amount (SOL)
        </label>
        <input
          type="number"
          step="0.001"
          min="0.001"
          value={transferAmount}
          onChange={(e) => setTransferAmount(e.target.value)}
          placeholder="0.001"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-ink bg-bg-surface focus:outline-none focus:ring-2 focus:ring-brand"
        />
      </div>

      {/* Send Button */}
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
            Send SOL
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
          <div className="flex items-center justify-between gap-2">
            <span>{result.message}</span>
            {result.signature && (
              <a
                href={`https://solscan.io/tx/${result.signature}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-link hover:underline flex items-center gap-1 text-xs font-medium"
              >
                View on Solscan
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
          </div>
        </div>
      )}
      
      {/* Info footer */}
      <p className="text-xs text-text-muted">
        💡 Uses @solana/kit RPC client for blockchain interactions
      </p>
    </div>
  );
}
