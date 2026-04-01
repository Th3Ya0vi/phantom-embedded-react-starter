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
 * BatchTransactionDemo - Tests signAndSendAllTransactions
 *
 * The recommended batch method per Phantom extension docs.
 * Creates multiple self-transfers and sends them in one batch call.
 *
 * Note: signAndSendAllTransactions exists at runtime on ISolanaChain
 * but is not in the exported TypeScript types, so we type-cast to access it.
 *
 * @see https://docs.phantom.com/solana/sending-a-transaction
 */
export default function BatchTransactionDemo() {
  const { solana, isAvailable } = useSolana();
  const { isConnected } = usePhantom();

  const [isSending, setIsSending] = useState(false);
  const [txCount, setTxCount] = useState(2);
  const [result, setResult] = useState<{
    type: "success" | "error";
    message: string;
    signatures?: string[];
  } | null>(null);

  const showResult = useCallback(
    (type: "success" | "error", message: string, signatures?: string[]) => {
      setResult({ type, message, signatures });
      setTimeout(() => setResult(null), 15000);
    },
    []
  );

  /** Check if signAndSendAllTransactions is available at runtime */
  const isBatchAvailable = useCallback((): boolean => {
    if (!solana) return false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return typeof (solana as any).signAndSendAllTransactions === "function";
  }, [solana]);

  /**
   * Build N self-transfer transactions
   * Each sends 0.001 SOL to self (only tx fee lost)
   */
  const buildTransactions = useCallback(
    async (count: number): Promise<Transaction[]> => {
      if (!solana) throw new Error("Solana provider not available");

      const publicKeyStr = solana.publicKey;
      if (!publicKeyStr) throw new Error("Public key unavailable");

      const userPubkey = new PublicKey(publicKeyStr);
      const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
      if (!rpcUrl) throw new Error("NEXT_PUBLIC_SOLANA_RPC_URL not configured");

      const connection = new Connection(rpcUrl);
      const { blockhash } = await connection.getLatestBlockhash();

      const transactions: Transaction[] = [];
      for (let i = 0; i < count; i++) {
        const tx = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: userPubkey,
            toPubkey: userPubkey,
            lamports: 0.001 * LAMPORTS_PER_SOL,
          })
        );
        tx.recentBlockhash = blockhash;
        tx.feePayer = userPubkey;
        transactions.push(tx);
      }

      return transactions;
    },
    [solana]
  );

  /** Send batch using signAndSendAllTransactions (injected providers) */
  const handleBatchSend = useCallback(async () => {
    if (!isAvailable || !solana) {
      showResult("error", "Please wait for wallet to initialize...");
      return;
    }

    if (!isBatchAvailable()) {
      showResult(
        "error",
        "signAndSendAllTransactions is not available on this provider. Try sequential mode for embedded wallets."
      );
      return;
    }

    setIsSending(true);
    try {
      const transactions = await buildTransactions(txCount);

      console.log(
        `📦 Sending batch of ${transactions.length} transactions via signAndSendAllTransactions`
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const batchResult = await (solana as any).signAndSendAllTransactions(
        transactions
      );

      console.log("✅ Batch result:", batchResult);

      const signatures: string[] = batchResult.signatures || [];
      showResult(
        "success",
        `✓ Batch sent! ${signatures.length} transactions confirmed.`,
        signatures
      );
    } catch (error) {
      console.error("❌ Batch transaction error:", error);
      showResult(
        "error",
        error instanceof Error ? error.message : "Batch transaction failed"
      );
    } finally {
      setIsSending(false);
    }
  }, [solana, isAvailable, isBatchAvailable, buildTransactions, txCount, showResult]);

  /** Send sequentially using signAndSendTransaction (works for embedded + injected) */
  const handleSequentialSend = useCallback(async () => {
    if (!isAvailable || !solana?.signAndSendTransaction) {
      showResult("error", "Please wait for wallet to initialize...");
      return;
    }

    setIsSending(true);
    try {
      const transactions = await buildTransactions(txCount);
      const signatures: string[] = [];

      console.log(
        `📦 Sending ${transactions.length} transactions sequentially via signAndSendTransaction`
      );

      for (let i = 0; i < transactions.length; i++) {
        console.log(`  → Sending TX ${i + 1}/${transactions.length}`);
        const result = await solana.signAndSendTransaction(transactions[i]);
        const sig = result.signature || "";
        signatures.push(sig);
        console.log(`  ✅ TX ${i + 1} sent: ${sig.slice(0, 20)}...`);
      }

      showResult(
        "success",
        `✓ Sequential send complete! ${signatures.length} transactions confirmed.`,
        signatures
      );
    } catch (error) {
      console.error("❌ Sequential transaction error:", error);
      showResult(
        "error",
        error instanceof Error ? error.message : "Sequential transaction failed"
      );
    } finally {
      setIsSending(false);
    }
  }, [solana, isAvailable, buildTransactions, txCount, showResult]);

  if (!isConnected) {
    return null;
  }

  const batchSupported = isBatchAvailable();

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-ink">
        Batch Transactions (signAndSendAllTransactions)
      </h3>

      <p className="text-sm text-text-muted">
        Send multiple transactions in a single batch call. Recommended over
        signAllTransactions per Phantom docs.
      </p>

      {/* Batch availability status */}
      <div
        className={`p-3 rounded-lg text-sm ${
          batchSupported
            ? "bg-green/10 text-green"
            : "bg-orange/10 text-orange"
        }`}
      >
        {batchSupported
          ? "signAndSendAllTransactions is available on this provider"
          : "signAndSendAllTransactions is not available — this provider may not support batch sending"}
      </div>

      {/* Transaction count selector */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-ink">
          Number of Transactions
        </label>
        <div className="flex gap-2">
          {[2, 3, 5].map((count) => (
            <button
              key={count}
              onClick={() => setTxCount(count)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                txCount === count
                  ? "bg-brand text-white"
                  : "border border-gray-200 text-ink hover:bg-gray-100"
              }`}
            >
              {count} txs
            </button>
          ))}
        </div>
      </div>

      {/* Send Buttons */}
      <div className="space-y-3">
        {/* Batch send - injected providers only */}
        <button
          onClick={handleBatchSend}
          disabled={!isAvailable || isSending || !batchSupported}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand text-white rounded-lg font-medium hover:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isSending ? (
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Batch Send {txCount} TXs (signAndSendAllTransactions)
            </>
          )}
        </button>

        {/* Sequential send - works for all providers including embedded */}
        <button
          onClick={handleSequentialSend}
          disabled={!isAvailable || isSending}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-gray-200 text-ink rounded-lg font-medium hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isSending ? (
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              Sequential Send {txCount} TXs (signAndSendTransaction × {txCount})
            </>
          )}
        </button>
      </div>

      {/* Result */}
      {result && (
        <div
          className={`p-3 rounded-lg text-sm ${
            result.type === "success"
              ? "bg-green/10 text-green"
              : "bg-orange/10 text-orange"
          }`}
        >
          <p>{result.message}</p>
          {result.signatures && result.signatures.length > 0 && (
            <div className="mt-2 space-y-1">
              {result.signatures.map((sig, i) => (
                <div key={sig} className="flex items-center justify-between">
                  <span className="text-xs font-mono opacity-80">
                    TX {i + 1}: {sig.slice(0, 20)}...
                  </span>
                  <a
                    href={`https://solscan.io/tx/${sig}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-link hover:underline text-xs"
                  >
                    View
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-text-muted">
        Each transaction sends 0.001 SOL to yourself (only tx fees lost).
        Batch uses signAndSendAllTransactions (1 prompt, injected only).
        Sequential uses signAndSendTransaction per TX (works everywhere including embedded).
      </p>
    </div>
  );
}
