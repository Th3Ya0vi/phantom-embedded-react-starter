'use client';

import { PhantomProvider, darkTheme, AddressType, DebugLevel } from "@phantom/react-sdk";
import type { PhantomDebugConfig } from "@phantom/react-sdk";
import { ReactNode, useMemo } from "react";

interface ConnectionProviderProps {
  children: ReactNode;
}

/**
 * ConnectionProvider wraps the app with PhantomProvider for wallet connectivity
 * 
 * Phantom Connect SDK v1.0.7
 * @see https://docs.phantom.com/sdks/react-sdk
 * 
 * v1.0.7 Additions:
 * - "phantom" provider: Phantom Login via extension or mobile app
 * - "deeplink" provider: opens Phantom mobile app on mobile devices
 * - ConnectButton: SDK-provided button with address display and wallet modal
 * - ConnectBox: inline embedded connection UI for auth callback pages
 * - useIsPhantomLoginAvailable(): check if Phantom Login is supported
 * - useTheme(): access the current SDK theme in custom components
 * - debugConfig prop: separate debug configuration (avoids SDK reinstantiation)
 * - presignTransaction: dapp-sponsored transaction co-signing support
 * - base64urlDecode / base64urlEncode: utility exports
 */
export default function ConnectionProvider({ children }: ConnectionProviderProps) {
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    console.log('Phantom SDK v1.0.7 Environment Check:', {
      appId: process.env.NEXT_PUBLIC_PHANTOM_APP_ID ? 'Set' : 'Missing',
      rpcUrl: process.env.NEXT_PUBLIC_SOLANA_RPC_URL ? 'Set' : 'Missing',
    });
  }

  const redirectUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/auth/callback`
    : process.env.NEXT_PUBLIC_APP_URL 
      ? `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`
      : '';

  // Separate debug config avoids reinstantiating the underlying SDK
  const debugConfig: PhantomDebugConfig = useMemo(() => ({
    enabled: process.env.NODE_ENV === 'development',
    level: DebugLevel.INFO,
  }), []);

  return (
    <PhantomProvider
      config={{
        addressTypes: [AddressType.solana, AddressType.ethereum],
        appId: process.env.NEXT_PUBLIC_PHANTOM_APP_ID || "",
        providers: [
          //"google",     // Google OAuth - creates embedded wallet
          //"apple",      // Apple ID - creates embedded wallet
          "phantom",    // Phantom Login - auth via extension or mobile app (v1.0.7)
          //"injected",   // Browser extension (Phantom, Solflare, etc.) via Wallet Standard
          //"deeplink",   // Opens Phantom mobile app on mobile devices (v1.0.7)
        ],
        authOptions: {
          redirectUrl,
        },
        embeddedWalletType: "user-wallet",
      }}
      theme={darkTheme}
      appName="Phantom Starter"
      appIcon="/phantom-logo.png"
      debugConfig={debugConfig}
    >
      {children}
    </PhantomProvider>
  );
}