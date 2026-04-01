"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  useDisconnect,
  useAccounts,
  usePhantom,
  useModal,
  useDiscoveredWallets,
  useSolana,
  useAutoConfirm,
  useIsExtensionInstalled,
  useIsPhantomLoginAvailable,
  WalletAddress,
  NetworkId,
} from "@phantom/react-sdk";
import { Connection, PublicKey } from "@solana/web3.js";
import PhantomIcon from "./icons/PhantomIcon";

/**
 * Connected wallet info - tracks which wallet the user connected with
 */
interface ConnectedWalletInfo {
  id: string;
  name: string;
  icon: string;
  provider: "embedded" | "injected";
}

/**
 * WalletIcon - Renders the wallet icon dynamically
 * Shows the connected wallet's icon (Backpack, Solflare, etc.)
 * Falls back to PhantomIcon for embedded wallets or missing icons
 */
function WalletIcon({ 
  walletInfo, 
  className = "w-6 h-6",
  fallbackClassName = "w-6 h-6"
}: { 
  walletInfo: ConnectedWalletInfo | null;
  className?: string;
  fallbackClassName?: string;
}) {
  // Embedded provider or no info → Phantom icon
  if (!walletInfo || walletInfo.provider === "embedded") {
    return <PhantomIcon className={fallbackClassName} />;
  }

  // Empty icon → Phantom icon fallback (known issue with Phantom adapter)
  if (!walletInfo.icon || walletInfo.icon === "") {
    return <PhantomIcon className={fallbackClassName} />;
  }

  // Render the wallet's icon from URL (data URI or https)
  return (
    <img 
      src={walletInfo.icon} 
      alt={`${walletInfo.name} icon`}
      className={className}
      onError={(e) => {
        e.currentTarget.style.display = 'none';
      }}
    />
  );
}

/**
 * ConnectWalletButton - Main wallet connection component
 * 
 * Phantom Connect SDK v1.0.7
 * @see https://docs.phantom.com/sdks/react-sdk
 * 
 * Features:
 * - useModal() for the built-in connection modal (supports phantom + deeplink providers)
 * - useDiscoveredWallets() for wallet discovery with icons
 * - useSolana() for Solana-specific operations
 * - useAutoConfirm() for auto-confirm (injected provider only)
 * - useIsPhantomLoginAvailable() to check Phantom Login support
 * - Dynamic wallet icon display after connection
 * 
 * Note: SDK also exports a ready-to-use <ConnectButton /> component.
 * This custom component provides richer UX with balance, copy, and auto-confirm controls.
 */
export default function ConnectWalletButton() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [connectedWalletInfo, setConnectedWalletInfo] = useState<ConnectedWalletInfo | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // SDK hooks
  const { open: openModal, close: closeModal, isOpened: isModalOpen } = useModal();
  const { disconnect, isDisconnecting } = useDisconnect();
  const accounts = useAccounts() as WalletAddress[] | null;
  
  const { 
    isLoading: isSDKLoading, 
    isConnected: phantomConnected,
    user,
  } = usePhantom();

  const { solana, isAvailable: isSolanaAvailable } = useSolana();

  const { 
    enable: enableAutoConfirm, 
    disable: disableAutoConfirm,
    status: autoConfirmStatus,
    supportedChains: autoConfirmChains,
  } = useAutoConfirm();

  const { isInstalled: isExtensionInstalled } = useIsExtensionInstalled();
  const { isAvailable: isPhantomLoginAvailable } = useIsPhantomLoginAvailable();

  const { 
    wallets: discoveredWallets, 
  } = useDiscoveredWallets();

  // Derived state
  const isConnected = (accounts && accounts.length > 0) || phantomConnected;
  const primaryAccount = accounts?.[0];
  const primaryAddress = primaryAccount?.address;

  /**
   * Detect which wallet the user connected with.
   * ConnectResult.wallet carries the wallet info directly from the SDK.
   * Falls back to discoveredWallets lookup by walletId.
   */
  useEffect(() => {
    if (!isConnected) {
      setConnectedWalletInfo(null);
      return;
    }

    // Embedded provider (Google/Apple OAuth)
    const isEmbedded = user?.authProvider === 'google' || user?.authProvider === 'apple';
    if (isEmbedded) {
      setConnectedWalletInfo({ id: 'phantom-embedded', name: 'Phantom', icon: '', provider: 'embedded' });
      return;
    }

    // SDK provides wallet info directly via ConnectResult
    if (user?.wallet) {
      setConnectedWalletInfo({
        id: user.wallet.id,
        name: user.wallet.name,
        icon: user.wallet.icon || '',
        provider: 'injected',
      });
      return;
    }

    // Fallback: match walletId against discovered wallets
    if (user?.walletId && discoveredWallets?.length) {
      const match = discoveredWallets.find(w => w.id === user.walletId);
      if (match) {
        setConnectedWalletInfo({
          id: match.id,
          name: match.name,
          icon: match.icon || '',
          provider: 'injected',
        });
        return;
      }
    }

    setConnectedWalletInfo({ id: 'unknown', name: 'Wallet', icon: '', provider: 'injected' });
  }, [isConnected, user, discoveredWallets]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch SOL balance when connected
  useEffect(() => {
    const fetchBalance = async () => {
      if (isConnected && primaryAddress) {
        try {
          const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
          if (!rpcUrl) return;
          const connection = new Connection(rpcUrl);
          const publicKey = new PublicKey(primaryAddress);
          const balanceInLamports = await connection.getBalance(publicKey);
          setBalance(balanceInLamports / 1e9);
        } catch (err) {
          console.error("Error fetching balance:", err);
          setBalance(0);
        }
      }
    };
    fetchBalance();
  }, [isConnected, primaryAddress]);

  // Disconnect handler
  const handleDisconnect = useCallback(async () => {
    try {
      await disconnect();
      setIsDropdownOpen(false);
      setBalance(null);
      setConnectedWalletInfo(null);
    } catch (err) {
      console.error("Disconnect error:", err);
    }
  }, [disconnect]);

  // Copy address handler
  const handleCopyAddress = useCallback(() => {
    if (primaryAddress) {
      navigator.clipboard.writeText(primaryAddress);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  }, [primaryAddress]);

  // Format address for display
  const formatAddress = (address: string): string => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  // Loading state
  if (isSDKLoading) {
    return (
      <button
        disabled
        className="flex items-center gap-3 px-6 py-3 bg-phantom/50 text-white rounded-xl font-semibold cursor-wait"
      >
        <PhantomIcon className="w-6 h-6 animate-pulse" />
        <span>Loading...</span>
      </button>
    );
  }

  // Connected state - show address with wallet icon and dropdown
  if (isConnected) {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="group flex items-center gap-3 px-5 py-3 bg-phantom text-white rounded-xl font-medium hover:bg-phantom-dark focus:outline-none focus:ring-2 focus:ring-phantom-light transition-all shadow-lg shadow-phantom/20"
        >
          {/* Dynamic wallet icon - shows connected wallet's icon */}
          <WalletIcon 
            walletInfo={connectedWalletInfo} 
            className="w-6 h-6 rounded-sm"
            fallbackClassName="w-6 h-6"
          />

          <span className="text-sm font-semibold">
            {primaryAddress ? formatAddress(primaryAddress) : "Connected"}
          </span>

          {/* Chevron */}
          <svg
            className={`w-4 h-4 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown Menu */}
        {isDropdownOpen && (
          <div className="absolute right-0 mt-2 w-72 bg-bg-surface rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Account Info */}
            <div className="p-4 border-b border-gray-200 bg-gradient-to-br from-phantom/5 to-transparent">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-phantom to-phantom-dark flex items-center justify-center p-2 overflow-hidden">
                  <WalletIcon 
                    walletInfo={connectedWalletInfo} 
                    className="w-full h-full object-contain"
                    fallbackClassName="w-full h-full"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted mb-1">
                    {connectedWalletInfo?.name && connectedWalletInfo.name !== 'Wallet' 
                      ? `Connected via ${connectedWalletInfo.name}` 
                      : 'Connected Account'}
                  </p>
                  <p className="text-sm font-mono font-semibold text-ink truncate">
                    {primaryAddress || "Unknown"}
                  </p>
                </div>
              </div>

              {/* Balance */}
              <div className="flex items-center justify-between p-3 bg-bg-page rounded-lg">
                <span className="text-xs font-medium text-muted">Balance</span>
                <span className="text-sm font-bold text-ink">
                  {balance !== null ? `${balance.toFixed(4)} SOL` : "Loading..."}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="p-2">
              {/* Copy Address */}
              <button
                onClick={handleCopyAddress}
                className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm text-ink hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                {copySuccess ? "Copied!" : "Copy Address"}
              </button>

              {/* Auto-Confirm Toggle (Injected Provider Only) */}
              {isExtensionInstalled && autoConfirmChains && (
                <button
                  onClick={async () => {
                    try {
                      if (autoConfirmStatus?.enabled) {
                        await disableAutoConfirm();
                      } else {
                        await enableAutoConfirm({ chains: [NetworkId.SOLANA_MAINNET] });
                      }
                    } catch (err) {
                      console.error("Auto-confirm toggle error:", err);
                    }
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm text-ink hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span className="flex-1">Auto-Confirm</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${autoConfirmStatus?.enabled ? 'bg-green/20 text-green' : 'bg-gray-200 text-gray-500'}`}>
                    {autoConfirmStatus?.enabled ? 'On' : 'Off'}
                  </span>
                </button>
              )}

              {/* Phantom Login availability indicator */}
              {isPhantomLoginAvailable && (
                <div className="flex items-center gap-3 px-3 py-2 text-sm text-ink">
                  <svg className="w-5 h-5 text-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span className="flex-1 text-text-muted">Phantom Login</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green/20 text-green">Available</span>
                </div>
              )}

              {/* Disconnect */}
              <button
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm text-orange hover:bg-orange/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-wait"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                {isDisconnecting ? "Logging out..." : "Log out"}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Disconnected state - show connect button that opens SDK modal
  return (
    <button
      onClick={openModal}
      disabled={isModalOpen}
      className="group flex items-center gap-3 px-6 py-3 bg-phantom text-white rounded-xl font-semibold hover:bg-phantom-dark focus:outline-none focus:ring-2 focus:ring-phantom-light transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-phantom/20 hover:shadow-xl hover:shadow-phantom/30"
    >
      <PhantomIcon className="w-6 h-6" />
      <span>Login with Phantom</span>
    </button>
  );
}
