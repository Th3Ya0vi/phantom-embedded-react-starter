'use client';

import { PhantomProvider, useConnect, useSolana } from "@phantom/react-sdk";
import { AddressType } from "@phantom/browser-sdk";
import { ReactNode } from "react";

interface ConnexionProviderProps {
  children: ReactNode;
}

export default function ConnexionProvider({ children }: ConnexionProviderProps) {
  return (
    <PhantomProvider
      config={{
        providerType: "embedded", // or "injected" for browser extension
        addressTypes: [AddressType.solana],
        appId: process.env.NEXT_PUBLIC_PHANTOM_APP_ID || "",
        authOptions: {
          authUrl: "https://connect.phantom.app/login",
          redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`, // Must be an existing page in your app and whitelisted in Phantom Portal
        },
      }}
    >
      {children}
      <WalletComponent />
    </PhantomProvider>
  );
}

function WalletComponent() {
  const { connect, isConnecting } = useConnect();
  const { solana } = useSolana();

  const handleConnect = async () => {
    const { addresses } = await connect({provider: "injected"});
    console.log("Connected addresses:", addresses);
  };

  const signSolanaMessage = async () => {
    const signature = await solana.signMessage("Hello Solana!");
    console.log("Solana signature:", signature);
  };

  return (
    <div>
      <button onClick={handleConnect} disabled={isConnecting}>
        {isConnecting ? "Connecting..." : "Connect Wallet"}
      </button>
      <button onClick={signSolanaMessage}>Sign Solana Message</button>
    </div>
  );
}