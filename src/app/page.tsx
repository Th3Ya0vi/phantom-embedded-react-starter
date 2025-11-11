"use client";

import { useState } from "react";
import Image from "next/image";

export default function Home() {
  const [isConnected, setIsConnected] = useState(false);

  return (
    <main className="min-h-screen bg-gradient-to-b from-bg-page to-gray-100 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
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
            Connect your Phantom wallet to get started
          </p>
        </header>

        {/* Main Card */}
        <div className="bg-bg-surface rounded-2xl shadow-lg border border-gray-200 p-6 sm:p-8">
          <div className="space-y-6">
            {/* Connection Status */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-vanilla/30 border border-gray-200">
              <div className="flex items-center gap-3">
                <div
                  className={`w-3 h-3 rounded-full ${
                    isConnected ? "bg-green" : "bg-gray-300"
                  }`}
                />
                <span className="font-medium text-ink">
                  {isConnected ? "Connected" : "Not Connected"}
                </span>
              </div>
            </div>

            {/* Connect Button */}
            <button
              onClick={() => setIsConnected(!isConnected)}
              className="w-full inline-flex items-center justify-center rounded-lg px-6 py-4 text-base font-medium bg-brand text-white hover:brightness-95 focus:outline-none focus:ring-2 ring-brand transition-all"
            >
              {isConnected ? "Disconnect Wallet" : "Connect Wallet"}
            </button>

            {/* Info Section */}
            <div className="pt-6 border-t border-gray-200">
              <h2 className="text-xl font-semibold mb-4 text-ink">
                Getting Started
              </h2>
              <ul className="space-y-3 text-text-default">
                <li className="flex items-start gap-3">
                  <span className="text-brand font-bold">1.</span>
                  <span>Click the "Connect Wallet" button above</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-brand font-bold">2.</span>
                  <span>Approve the connection in your Phantom wallet</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-brand font-bold">3.</span>
                  <span>Start building your dApp!</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center py-8 text-text-muted">
          <p>
            Built with{" "}
            <a
              href="https://phantom.app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-link hover:underline"
            >
              Phantom SDK
            </a>
          </p>
        </footer>
      </div>
    </main>
  );
}
