"use client";

/**
 * USDC/SPL Token Transfer Example for Phantom Embedded Wallet
 * 
 * This example demonstrates how to transfer USDC (or any SPL token) 
 * from a user's wallet to another wallet using the Phantom React SDK.
 * 
 * Use Cases:
 * 1. User buys ticket with USDC → transfer from user to merchant
 * 2. Distribute awards → transfer USDC from your wallet to users
 * 
 * Prerequisites:
 * - npm install @solana/spl-token @solana/web3.js @phantom/react-sdk
 * 
 * @see https://docs.phantom.com/sdks/react-sdk/sign-and-send-transaction
 */

import { useState, useCallback } from "react";
import { useSolana, usePhantom } from "@phantom/react-sdk";
import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAccount,
} from "@solana/spl-token";

// ============================================================================
// TOKEN CONSTANTS
// ============================================================================

// USDC Mint Addresses (use the appropriate one for your network)
const USDC_MINT = {
  mainnet: new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
  devnet: new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"), // Devnet USDC
};

// USDC has 6 decimal places
const USDC_DECIMALS = 6;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert USDC amount to smallest unit (like cents to dollars)
 * @param amount - Amount in USDC (e.g., 10.50 for $10.50)
 * @returns Amount in smallest unit
 */
function toUSDCAmount(amount: number): bigint {
  return BigInt(Math.round(amount * Math.pow(10, USDC_DECIMALS)));
}

/**
 * Check if an Associated Token Account exists
 */
async function doesATAExist(
  connection: Connection,
  ataAddress: PublicKey
): Promise<boolean> {
  try {
    await getAccount(connection, ataAddress);
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// TRANSFER USDC FUNCTION
// ============================================================================

/**
 * Create a transaction to transfer USDC from sender to recipient
 * 
 * @param connection - Solana connection
 * @param senderPublicKey - Sender's wallet public key
 * @param recipientAddress - Recipient's wallet address (string or PublicKey)
 * @param amount - Amount in USDC (e.g., 5.00 for $5.00)
 * @param mint - Token mint address (defaults to mainnet USDC)
 * @returns Transaction ready to be signed and sent
 */
async function createUSDCTransferTransaction(
  connection: Connection,
  senderPublicKey: PublicKey,
  recipientAddress: string | PublicKey,
  amount: number,
  mint: PublicKey = USDC_MINT.mainnet
): Promise<Transaction> {
  const recipient = typeof recipientAddress === "string" 
    ? new PublicKey(recipientAddress) 
    : recipientAddress;

  // Get Associated Token Accounts for sender and recipient
  const senderATA = await getAssociatedTokenAddress(
    mint,
    senderPublicKey,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  const recipientATA = await getAssociatedTokenAddress(
    mint,
    recipient,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  // Build transaction instructions
  const instructions: TransactionInstruction[] = [];

  // Check if recipient has an ATA, if not, create one
  // (sender pays for account creation ~0.002 SOL)
  const recipientATAExists = await doesATAExist(connection, recipientATA);
  if (!recipientATAExists) {
    console.log("Creating Associated Token Account for recipient...");
    instructions.push(
      createAssociatedTokenAccountInstruction(
        senderPublicKey,    // payer
        recipientATA,       // ata address
        recipient,          // owner
        mint,               // mint
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );
  }

  // Add transfer instruction
  const transferAmount = toUSDCAmount(amount);
  instructions.push(
    createTransferInstruction(
      senderATA,          // source
      recipientATA,       // destination
      senderPublicKey,    // owner
      transferAmount,     // amount in smallest unit
      [],                 // multisig signers (empty for single signer)
      TOKEN_PROGRAM_ID
    )
  );

  // Create and configure transaction
  const { blockhash } = await connection.getLatestBlockhash();
  const transaction = new Transaction().add(...instructions);
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = senderPublicKey;

  return transaction;
}

// ============================================================================
// REACT COMPONENT EXAMPLE
// ============================================================================

interface USDCTransferProps {
  // Your merchant/business wallet address to receive payments
  merchantWallet?: string;
}

export default function USDCTransfer({ 
  merchantWallet = "YOUR_MERCHANT_WALLET_ADDRESS" 
}: USDCTransferProps) {
  const { solana, isAvailable } = useSolana();
  const { isConnected } = usePhantom();

  // Form state
  const [recipientAddress, setRecipientAddress] = useState(merchantWallet);
  const [amount, setAmount] = useState("1.00");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  /**
   * Handle USDC transfer
   */
  const handleTransfer = useCallback(async () => {
    if (!isAvailable || !solana?.signAndSendTransaction) {
      setResult({ type: "error", message: "Wallet not available" });
      return;
    }

    if (!recipientAddress || !amount) {
      setResult({ type: "error", message: "Please fill in all fields" });
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const publicKey = solana.publicKey;
      if (!publicKey) {
        throw new Error("Wallet not connected");
      }
      const senderPubkey = new PublicKey(publicKey);

      // Connect to Solana
      const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
      if (!rpcUrl) {
        throw new Error("NEXT_PUBLIC_SOLANA_RPC_URL not configured");
      }
      const connection = new Connection(rpcUrl);

      // Create the USDC transfer transaction
      const transaction = await createUSDCTransferTransaction(
        connection,
        senderPubkey,
        recipientAddress,
        parseFloat(amount),
        USDC_MINT.mainnet // Use USDC_MINT.devnet for testing
      );

      // Sign and send using Phantom embedded wallet
      // This happens seamlessly without extension popups!
      const txResult = await solana.signAndSendTransaction(transaction);
      
      console.log("✅ USDC Transfer successful:", txResult);
      const signature = txResult.signature || "";
      
      setResult({
        type: "success",
        message: `✓ Sent ${amount} USDC! TX: ${signature.slice(0, 16)}...`
      });

    } catch (error) {
      console.error("❌ Transfer error:", error);
      setResult({
        type: "error",
        message: error instanceof Error ? error.message : "Transfer failed"
      });
    } finally {
      setIsLoading(false);
    }
  }, [solana, isAvailable, recipientAddress, amount]);

  // Don't render if not connected
  if (!isConnected) {
    return null;
  }

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <h3 className="text-lg font-semibold">Send USDC</h3>
      
      {/* Recipient Address Input */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Recipient Address
        </label>
        <input
          type="text"
          value={recipientAddress}
          onChange={(e) => setRecipientAddress(e.target.value)}
          placeholder="Enter Solana wallet address"
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Amount Input */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Amount (USDC)
        </label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          step="0.01"
          min="0"
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Send Button */}
      <button
        onClick={handleTransfer}
        disabled={!isAvailable || isLoading}
        className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? "Sending..." : `Send ${amount} USDC`}
      </button>

      {/* Result Message */}
      {result && (
        <div
          className={`p-3 rounded-lg text-sm ${
            result.type === "success"
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {result.message}
        </div>
      )}

      {/* Info */}
      <p className="text-xs text-gray-500">
        💡 First transfer to a new wallet creates their token account (~0.002 SOL fee)
      </p>
    </div>
  );
}

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/**
 * Example 1: Ticket Purchase Flow
 * 
 * When a user buys a ticket with USDC:
 * 
 * ```tsx
 * const MERCHANT_WALLET = "YourMerchantWalletAddressHere";
 * const TICKET_PRICE = 25.00; // $25 USDC
 * 
 * async function handleTicketPurchase() {
 *   const { solana } = useSolana();
 *   const publicKey = solana.publicKey;
 *   const connection = new Connection(rpcUrl);
 *   
 *   const transaction = await createUSDCTransferTransaction(
 *     connection,
 *     new PublicKey(publicKey),
 *     MERCHANT_WALLET,
 *     TICKET_PRICE
 *   );
 *   
 *   const result = await solana.signAndSendTransaction(transaction);
 *   // Save result.signature to your database with ticket info
 * }
 * ```
 */

/**
 * Example 2: Award Distribution (Server-Side)
 * 
 * For sending USDC from your wallet to users (awards/payouts),
 * you need server-side signing with your private key.
 * 
 * This is NOT done with the embedded wallet SDK - use a backend:
 * 
 * ```ts
 * // server/distribute-award.ts
 * import { Keypair, Connection, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
 * 
 * async function distributeAward(userWallet: string, amount: number) {
 *   // Load your merchant wallet keypair (KEEP SECRET!)
 *   const merchantKeypair = Keypair.fromSecretKey(
 *     bs58.decode(process.env.MERCHANT_PRIVATE_KEY!)
 *   );
 *   
 *   const connection = new Connection(rpcUrl);
 *   
 *   const transaction = await createUSDCTransferTransaction(
 *     connection,
 *     merchantKeypair.publicKey,
 *     userWallet,
 *     amount
 *   );
 *   
 *   // Sign with your keypair and send
 *   const signature = await sendAndConfirmTransaction(
 *     connection,
 *     transaction,
 *     [merchantKeypair]
 *   );
 *   
 *   return signature;
 * }
 * ```
 */


