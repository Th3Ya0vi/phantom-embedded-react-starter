"use client";

import { useState, useCallback } from "react";
import { useSolana, usePhantom } from "@phantom/react-sdk";
import {
  createSolanaRpc,
  pipe,
  createTransactionMessage,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstruction,
  address,
  compileTransaction,
  createNoopSigner,
  getTransactionEncoder,
} from "@solana/kit";
import { getTransferSolInstruction } from "@solana-program/system";
import { VersionedTransaction } from "@solana/web3.js";

/**
 * SolanaKitTransactionDemo - @solana/kit transaction building with Phantom SDK
 *
 * Transaction building is 100% @solana/kit:
 * - createSolanaRpc for RPC calls
 * - pipe + createTransactionMessage for building v0 transactions
 * - getTransferSolInstruction from @solana-program/system
 * - compileTransaction to produce a compiled transaction
 * - createNoopSigner for Phantom-managed signing
 *
 * The compiled transaction is then bridged to VersionedTransaction (@solana/web3.js)
 * for compatibility with Phantom's signAndSendTransaction, which requires .serialize().
 *
 * @see https://docs.phantom.com/sdks/react-sdk/sign-and-send-transaction
 */
export default function SolanaKitTransactionDemo() {
  const { solana, isAvailable } = useSolana();
  const { isConnected } = usePhantom();

  // UI state
  const [isSendingTx, setIsSendingTx] = useState(false);
  const [result, setResult] = useState<{
    type: "success" | "error";
    message: string;
    signature?: string;
  } | null>(null);

  /** Show result with auto-clear after 10 seconds */
  const showResult = useCallback(
    (type: "success" | "error", message: string, signature?: string) => {
      setResult({ type, message, signature });
      setTimeout(() => setResult(null), 10000);
    },
    []
  );

  /**
   * Send SOL using pure @solana/kit
   * Transfers to SELF for safety (only loses ~0.000005 SOL tx fee)
   */
  const handleSendTransaction = useCallback(async () => {
    // Guard: wallet must be ready with signAndSendTransaction
    if (!isAvailable || !solana?.signAndSendTransaction) {
      showResult("error", "Please wait for wallet to initialize...");
      return;
    }

    setIsSendingTx(true);
    try {
      // Step 1: Get user's public key from Phantom SDK
      const userPublicKeyString = await solana.getPublicKey();
      if (!userPublicKeyString) {
        throw new Error("Wallet not connected or public key unavailable");
      }

      // Step 2: Create @solana/kit address and noop signer
      // createNoopSigner lets us build the instruction with a signer placeholder
      // Phantom's signAndSendTransaction handles the actual signing
      const userAddress = address(userPublicKeyString);
      const userSigner = createNoopSigner(userAddress);

      // Step 3: Create RPC client using @solana/kit
      const rpcUrl =
        process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
        "https://api.mainnet-beta.solana.com";
      const rpc = createSolanaRpc(rpcUrl);

      // Step 4: Get latest blockhash via @solana/kit RPC
      const { value: latestBlockhash } = await rpc
        .getLatestBlockhash()
        .send();

      // Step 5: Build transaction message using @solana/kit pipe pattern
      // This is 100% @solana/kit - no @solana/web3.js involved
      const transactionMessage = pipe(
        // Create a v0 transaction message
        createTransactionMessage({ version: 0 }),
        // Set the fee payer (uses Address, not Signer - per Phantom docs)
        (tx) => setTransactionMessageFeePayer(userAddress, tx),
        // Set the blockhash for lifetime
        (tx) =>
          setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        // Append the SOL transfer instruction
        (tx) =>
          appendTransactionMessageInstruction(
            getTransferSolInstruction({
              source: userSigner, // TransactionSigner (noop - Phantom signs)
              destination: userAddress, // Transfer to self for safety
              amount: 1_000_000, // 0.001 SOL in lamports
            }),
            tx
          )
      );

      // Step 6: Compile the transaction message into a wire-ready transaction
      const compiledTransaction = compileTransaction(transactionMessage);

      // Step 7: Encode @solana/kit transaction to bytes, then bridge to VersionedTransaction
      // Phantom's extension provider calls .serialize() which only exists on @solana/web3.js types.
      // We encode with @solana/kit and deserialize into VersionedTransaction for compatibility.
      const transactionBytes = getTransactionEncoder().encode(compiledTransaction);
      const versionedTransaction = VersionedTransaction.deserialize(
        new Uint8Array(transactionBytes)
      );

      console.log(
        "📦 @solana/kit compiled → VersionedTransaction:",
        versionedTransaction
      );

      // Step 8: Sign and send via Phantom SDK
      // Now passes a VersionedTransaction which both extension and embedded wallets accept
      const txResult =
        await solana.signAndSendTransaction(versionedTransaction);

      console.log("✅ Transaction sent:", txResult);

      // Extract signature from result
      const txId = txResult.signature || "";
      showResult("success", `✓ Sent! TX: ${txId.slice(0, 16)}...`, txId);
    } catch (error) {
      console.error("❌ @solana/kit transaction error:", error);
      showResult(
        "error",
        error instanceof Error ? error.message : "Transaction failed"
      );
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
        Send Transaction (@solana/kit)
      </h3>

      <p className="text-sm text-text-muted">
        Send SOL using @solana/kit with Phantom SDK.
      </p>

      {/* Send Transaction Button */}
      <button
        onClick={handleSendTransaction}
        disabled={!isAvailable || isSendingTx}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand text-white rounded-lg font-medium hover:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {isSendingTx ? (
          <>
            <svg
              className="w-4 h-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Sending...
          </>
        ) : (
          <>
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            Send 0.001 SOL (pure @solana/kit)
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
                <svg
                  className="w-3 h-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            )}
          </div>
        </div>
      )}

      {/* Info footer */}
      <p className="text-xs text-text-muted">
        Uses @solana/kit pipe + compileTransaction + @solana-program/system,
        signed and sent with Phantom SDK
      </p>
    </div>
  );
}
