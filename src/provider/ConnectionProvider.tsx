'use client';

import { PhantomProvider, darkTheme, AddressType } from "@phantom/react-sdk";
import { ReactNode } from "react";

/**
 * Props for the ConnectionProvider component
 */
interface ConnectionProviderProps {
  children: ReactNode;
}

/**
 * ConnectionProvider wraps the app with PhantomProvider for wallet connectivity
 * 
 * Phantom Connect SDK (Beta 26)
 * @see https://docs.phantom.com/sdks/react-sdk
 * 
 * Config options:
 * - appId: App ID from Phantom Portal (required for OAuth providers)
 * - providers: ["google", "apple", "phantom", "injected"]
 * - addressTypes: [AddressType.solana, AddressType.ethereum]
 * - authOptions.redirectUrl: OAuth callback URL (required for Google/Apple)
 * - embeddedWalletType: "user-wallet" | "app-wallet" (optional)
 * 
 * Hooks available:
 * - useSolana(): { solana, isAvailable } - for signAndSendTransaction
 * - useEthereum(): { ethereum, isAvailable } - for Ethereum operations
 * - useModal(): { open, isOpened } - control connection modal
 * - useAccounts(): WalletAccount[] - get connected accounts
 * - usePhantom(): { isConnected, isLoading } - connection state
 * - useDiscoveredWallets(): { wallets } - detected wallets
 */
export default function ConnectionProvider({ children }: ConnectionProviderProps) {
  // Debug: Log environment variables (only in development)
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    console.log('🔧 Environment Check:', {
      appId: process.env.NEXT_PUBLIC_PHANTOM_APP_ID ? '✅ Set' : '❌ Missing',
      rpcUrl: process.env.NEXT_PUBLIC_SOLANA_RPC_URL ? '✅ Set' : '❌ Missing',
    });
  }

  // Get the redirect URL for OAuth callbacks
  const redirectUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/auth/callback`
    : process.env.NEXT_PUBLIC_APP_URL 
      ? `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`
      : '';

  return (
    <PhantomProvider
      config={{
        // Network support - Solana blockchain
        addressTypes: [AddressType.solana],
        // App ID from Phantom Portal (required for embedded providers)
        appId: process.env.NEXT_PUBLIC_PHANTOM_APP_ID || "",
        // Authentication providers available to users
        // The modal will automatically detect and display available wallets
        providers: [
          "google",     // Google OAuth
          "apple",      // Apple ID  
          "phantom",    // Phantom Login
          "injected",   // Browser extension + discovered wallets via Wallet Standard
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