'use client';

import { PhantomProvider, darkTheme, AddressType } from "@phantom/react-sdk";
import { ReactNode } from "react";
import { _env } from "@/config/_env";

/**
 * Props for the ConnectionProvider component
 */
interface ConnectionProviderProps {
  children: ReactNode;
}

/**
 * ConnectionProvider wraps the app with PhantomProvider for wallet connectivity
 * 
 * Phantom Connect SDK v1.0.0 (Stable Release)
 * @see https://docs.phantom.com/sdks/react-sdk
 * 
 * Config options:
 * - appId: App ID from Phantom Portal (required for OAuth providers)
 * - providers: ["google", "apple", "injected"]
 * - addressTypes: [AddressType.solana, AddressType.ethereum]
 * - authOptions.redirectUrl: OAuth callback URL (required for Google/Apple)
 * - embeddedWalletType: "user-wallet" | "app-wallet" (optional)
 * 
 * Hooks available (v1.0.0):
 * - useSolana(): { solana, isAvailable } - Solana chain operations
 * - useEthereum(): { ethereum, isAvailable } - Ethereum chain operations
 * - useModal(): { open, close, isOpened } - control connection modal
 * - useAccounts(): WalletAddress[] - get connected accounts
 * - usePhantom(): { isConnected, isLoading, user, allowedProviders } - connection state
 * - useDiscoveredWallets(): { wallets, refetch } - detected wallets via Wallet Standard
 * - useAutoConfirm(): { enable, disable, status } - auto-confirm for injected provider
 * - useIsExtensionInstalled(): { isInstalled, isLoading } - check Phantom extension
 * - useIsPhantomLoginAvailable(): { isAvailable, isLoading } - check Phantom Login support
 * - useConnect(): { connect, isConnecting } - programmatic connection
 * - useDisconnect(): { disconnect, isDisconnecting } - programmatic disconnection
 * 
 * Components available (v1.0.0):
 * - ConnectButton: Pre-built connect button with state management
 * - ConnectBox: Pre-built connect box with full login UI
 */
export default function ConnectionProvider({ children }: ConnectionProviderProps) {
  // Debug: Log environment variables (only in development)
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    console.log('🔧 Phantom SDK v1.0.0 Environment Check:', {
      appId: process.env.NEXT_PUBLIC_PHANTOM_APP_ID ? '✅ Set' : '❌ Missing',
      rpcUrl: process.env.NEXT_PUBLIC_SOLANA_RPC_URL ? '✅ Set' : '❌ Missing',
    });
  }

  // Get the redirect URL for OAuth callbacks
  const redirectUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/auth/callback`
    : _env.appUrl 
      ? `${_env.appUrl}/auth/callback`
      : '';

  return (
    <PhantomProvider
      config={{
        // Network support - Solana and Ethereum blockchains
        // This enables wallet discovery via Wallet Standard (Solana) and EIP-6963 (Ethereum)
        addressTypes: [AddressType.solana, AddressType.ethereum],
        // App ID from Phantom Portal (required for embedded providers)
        appId: _env.phantomAppId,
        // Authentication providers available to users
        // The modal will automatically detect and display available wallets via Wallet Standard
        providers: [
          "google",     // Google OAuth - creates embedded wallet
          "apple",      // Apple ID - creates embedded wallet
          "injected",   // Browser extension (Phantom, Solflare, etc.) via Wallet Standard
        ],
        // OAuth callback configuration (required for Google/Apple providers)
        authOptions: {
          redirectUrl,
        },
      }}
      // Theme for built-in modal UI (darkTheme or lightTheme available)
      theme={darkTheme}
      // App branding for the connection modal
      appName="Phantom Starter"
      // App icon displayed in the modal (optional)
      appIcon="/phantom-logo.png"
    >
      {children}
    </PhantomProvider>
  );
}