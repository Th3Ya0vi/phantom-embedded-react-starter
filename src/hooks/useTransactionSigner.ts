"use client";

import { useCallback, useState } from "react";
import { useSolana, usePhantom } from "@phantom/react-sdk";
import { Transaction, Connection, PublicKey } from "@solana/web3.js";

/**
 * Transaction signing result
 */
interface TransactionResult {
  signature: string;
  success: boolean;
  error?: string;
}

/**
 * Hook for safely signing and sending transactions with embedded wallets
 * 
 * IMPORTANT: Embedded wallets (Google/Apple OAuth) do NOT support:
 * - signTransaction (use signAndSendTransaction instead)
 * - signAllTransactions (send transactions sequentially)
 * 
 * This hook provides a safe wrapper that:
 * 1. Validates wallet connection and availability
 * 2. Ensures the solana object is properly initialized
 * 3. Uses signAndSendTransaction (the only supported method for embedded wallets)
 * 4. Handles multiple transactions sequentially if needed
 * 
 * @see https://docs.phantom.com/sdks/react-sdk/sign-and-send-transaction
 */
export function useTransactionSigner() {
  const { solana, isAvailable } = useSolana();
  const { isConnected } = usePhantom();
  const [isSigning, setIsSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Validates that the wallet is ready for transactions
   */
  const validateWallet = useCallback(async (): Promise<PublicKey> => {
    // Check connection state
    if (!isConnected) {
      throw new Error("Wallet not connected. Please connect your wallet first.");
    }

    // Check if solana provider is available
    if (!isAvailable) {
      throw new Error("Solana provider is not available. Please wait for initialization.");
    }

    // Check if solana object exists
    if (!solana) {
      throw new Error("Solana provider object is undefined. Please reconnect your wallet.");
    }

    // Check if signAndSendTransaction method exists
    if (!solana.signAndSendTransaction) {
      throw new Error(
        "signAndSendTransaction method is not available. " +
        "This may indicate an embedded wallet limitation or SDK version mismatch."
      );
    }

    const publicKeyString = solana.publicKey;
    if (!publicKeyString) {
      throw new Error("Public key is not available. Please reconnect your wallet.");
    }

    return new PublicKey(publicKeyString);
  }, [isConnected, isAvailable, solana]);

  /**
   * Signs and sends a single transaction
   * This is the ONLY supported method for embedded wallets
   */
  const signAndSendTransaction = useCallback(
    async (transaction: Transaction): Promise<TransactionResult> => {
      setError(null);
      setIsSigning(true);

      try {
        // Validate wallet state
        const publicKey = await validateWallet();

        // Ensure transaction has required fields
        if (!transaction.feePayer) {
          transaction.feePayer = publicKey;
        }

        // Sign and send transaction
        // This is the ONLY method supported for embedded wallets
        const result = await solana!.signAndSendTransaction(transaction);

        // Extract signature from result
        const signature = result.signature || "";

        if (!signature) {
          throw new Error("Transaction sent but no signature returned");
        }

        return {
          signature,
          success: true,
        };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Transaction failed";
        setError(errorMessage);

        return {
          signature: "",
          success: false,
          error: errorMessage,
        };
      } finally {
        setIsSigning(false);
      }
    },
    [solana, validateWallet]
  );

  /**
   * Signs and sends multiple transactions sequentially
   * 
   * NOTE: Embedded wallets do NOT support signAllTransactions.
   * This function sends transactions one by one, waiting for each to complete.
   * 
   * @param transactions Array of transactions to send
   * @param options Optional configuration
   * @returns Array of results for each transaction
   */
  const signAndSendAllTransactions = useCallback(
    async (
      transactions: Transaction[],
      options?: {
        onProgress?: (index: number, total: number) => void;
        stopOnError?: boolean;
      }
    ): Promise<TransactionResult[]> => {
      setError(null);
      setIsSigning(true);

      const results: TransactionResult[] = [];
      const stopOnError = options?.stopOnError ?? true;

      try {
        // Validate wallet state first
        await validateWallet();

        // Send transactions sequentially
        for (let i = 0; i < transactions.length; i++) {
          const transaction = transactions[i];

          // Report progress
          options?.onProgress?.(i + 1, transactions.length);

          // Sign and send this transaction
          const result = await signAndSendTransaction(transaction);
          results.push(result);

          // Stop on error if configured
          if (!result.success && stopOnError) {
            break;
          }
        }

        return results;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Batch transaction failed";
        setError(errorMessage);

        // Fill remaining results with error
        while (results.length < transactions.length) {
          results.push({
            signature: "",
            success: false,
            error: errorMessage,
          });
        }

        return results;
      } finally {
        setIsSigning(false);
      }
    },
    [signAndSendTransaction, validateWallet]
  );

  /**
   * Prepares a transaction with the latest blockhash
   * Helper function to ensure transactions are properly formatted
   */
  const prepareTransaction = useCallback(
    async (
      transaction: Transaction,
      connection: Connection,
      feePayer?: PublicKey
    ): Promise<Transaction> => {
      // Get fee payer
      let payer = feePayer;
      if (!payer) {
        const publicKey = await validateWallet();
        payer = publicKey;
      }

      // Get latest blockhash
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash();

      // Set transaction properties
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = payer;

      return transaction;
    },
    [validateWallet]
  );

  return {
    signAndSendTransaction,
    signAndSendAllTransactions,
    prepareTransaction,
    isSigning,
    error,
    isAvailable: isAvailable && !!solana?.signAndSendTransaction,
    isConnected,
  };
}
