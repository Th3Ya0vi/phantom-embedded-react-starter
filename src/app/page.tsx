"use client";

import Image from "next/image";
import ConnectWalletButton from "@/components/ConnectWalletButton";
import TransactionDemo from "@/components/TransactionDemo";
import SignMessageDemo from "@/components/SignMessageDemo";
import SolanaKitTransactionDemo from "@/components/SolanaKitTransactionDemo";
import CustomTransferDemo from "@/components/CustomTransferDemo";
import BatchTransactionDemo from "@/components/BatchTransactionDemo";
import ThemeToggle from "@/components/ThemeToggle";
import { useAccounts, ConnectButton as SDKConnectButton, AddressType } from "@phantom/react-sdk";

export default function Home() {
  const accounts = useAccounts();
  const isConnected = accounts && accounts.length > 0;

  return (
    <main className="min-h-screen bg-gradient-to-b from-bg-page to-bg-surface p-4 sm:p-8 transition-colors">
      <div className="max-w-4xl mx-auto">
        {/* Theme Toggle - Top Right */}
        <div className="flex justify-end mb-4">
          <ThemeToggle />
        </div>

        {/* Header */}
        <header className="text-center py-8 sm:py-12">
          <div className="flex justify-center mb-6">
            <Image
              src="/phantom-logo.png"
              alt="Phantom Logo"
              width={80}
              height={80}
              priority
            />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4 text-ink">
            Phantom Embedded Wallet
          </h1>
          <p className="text-lg text-muted">
            Sign in with Google, Apple, or Phantom to get started
          </p>
        </header>

        {/* Main Card */}
        <div className="bg-bg-surface rounded-2xl shadow-lg border border-gray-200 p-6 sm:p-8">
          <div className="space-y-6">
            {/* Connect Button */}
            <div className="flex flex-col items-center gap-4">
              <ConnectWalletButton />

              {/* SDK built-in ConnectButton (v1.0.7) - shows address + wallet modal when connected */}
              <div className="flex flex-col items-center gap-1">
                <span className="text-xs text-text-muted">or use SDK&apos;s built-in button:</span>
                <SDKConnectButton addressType={AddressType.solana} />
              </div>
            </div>

            {/* Transaction Demos - Only shows when connected */}
            {isConnected && (
              <>
                <div className="pt-6 border-t border-gray-200">
                  <TransactionDemo />
                </div>
                <div className="pt-6 border-t border-gray-200">
                  <SolanaKitTransactionDemo />
                </div>
                <div className="pt-6 border-t border-gray-200">
                  <CustomTransferDemo />
                </div>
                <div className="pt-6 border-t border-gray-200">
                  <SignMessageDemo />
                </div>
                <div className="pt-6 border-t border-gray-200">
                  <BatchTransactionDemo />
                </div>
              </>
            )}

            {/* Info Section - Only shows when not connected */}
            {!isConnected && (
              <div className="pt-6 border-t border-gray-200">
                <h2 className="text-xl font-semibold mb-4 text-ink">
                  Getting Started
                </h2>
                <ul className="space-y-3 text-text-default">
                  <li className="flex items-start gap-3">
                    <span className="text-brand font-bold">1.</span>
                    <span>Click &quot;Login with Phantom&quot; above</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-brand font-bold">2.</span>
                    <span>Choose your sign-in method (Google, Apple, Phantom, or discovered wallets)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-brand font-bold">3.</span>
                    <span>Start building your dApp!</span>
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center py-8 text-text-muted">
          <p>
            Built with{" "}
            <a
              href="https://docs.phantom.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-link hover:underline"
            >
              Phantom Connect SDK
            </a>
          </p>
        </footer>
      </div>
    </main>
  );
}
