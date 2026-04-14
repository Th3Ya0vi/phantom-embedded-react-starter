# Phantom Embedded Wallet React Starter

A modern, production-ready starter template for building Solana dApps with the [Phantom Connect SDK](https://docs.phantom.com/sdks/react-sdk).

## Features

- ⚡️ **Next.js 16** - Latest App Router with React Server Components
- 👻 **Phantom Connect SDK** - Integrated wallet with built-in modal UI
- 🔑 **OAuth Support** - Google, Apple, and Phantom Login authentication
- 💸 **Transaction Demo** - Sign message & send SOL examples
- 🎨 **Tailwind CSS** - Utility-first styling with custom design tokens
- 🌗 **Dark Mode** - Built-in dark mode support
- 📱 **Responsive** - Mobile-first responsive design
- 🔐 **TypeScript** - Full type safety

## Tech Stack

- [Next.js](https://nextjs.org/) - React framework
- [@phantom/react-sdk](https://docs.phantom.com/sdks/react-sdk) - Phantom Connect SDK for React
- [@phantom/browser-sdk](https://docs.phantom.com/sdks/browser-sdk) - Phantom Connect SDK core
- [@solana/web3.js](https://solana-labs.github.io/solana-web3.js/) - Solana JavaScript API
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework

## Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm (recommended) or npm

### Installation

1. Clone the repository:

```bash
git clone <your-repo-url>
cd phantom-embedded-react-starter
```

2. Install dependencies:

```bash
pnpm install
# or
npm install
```

3. Copy the environment variables:

```bash
cp .env.example .env.local
```

4. Update the environment variables in `.env.local` with your configuration.

### Development

Run the development server:

```bash
pnpm dev
# or
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the app.

### Build

Build the application for production:

```bash
pnpm build
# or
npm run build
```

### Start Production Server

```bash
pnpm start
# or
npm start
```

## Project Structure

```
phantom-embedded-react-starter/
├── public/                  # Static assets
│   └── phantom-logo.png
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── auth/
│   │   │   └── callback/
│   │   │       └── page.tsx # OAuth callback handler
│   │   ├── globals.css      # Global styles with design tokens
│   │   ├── layout.tsx       # Root layout
│   │   └── page.tsx         # Home page
│   ├── components/          # React components
│   │   ├── ConnectWalletButton.tsx  # Main wallet connection UI
│   │   ├── TransactionDemo.tsx      # Sign message & send SOL demo
│   │   ├── ThemeToggle.tsx  # Dark/light mode toggle
│   │   └── icons/           # Icon components
│   └── provider/
│       ├── ConnectionProvider.tsx   # PhantomProvider wrapper
│       └── ThemeProvider.tsx        # Theme context
├── .env.example             # Environment variables template
├── next.config.js           # Next.js configuration
└── tsconfig.json            # TypeScript configuration
```

## Design System

This starter uses a custom design token system for consistent theming:

- **Color Tokens**: Defined in `globals.css` using CSS variables
- **Tailwind Integration**: Design tokens mapped to Tailwind utilities
- **Dark Mode**: Automatic dark mode support via `prefers-color-scheme`

### Key Design Tokens

- `--color-brand`: Primary brand color
- `--color-ink`: Primary text color
- `--color-paper`: Background color
- Additional semantic colors for states (success, warning, info)

## Phantom SDK Configuration

### PhantomProvider Config

The SDK is configured in `src/provider/ConnectionProvider.tsx`:

```javascript
<PhantomProvider
  config={{
    appId: "your-app-id",                    // From Phantom Portal
    addressTypes: [AddressType.solana],       // Supported chains
    providers: ["google", "apple", "phantom", "injected"],
    authOptions: {
      redirectUrl: "https://yourapp.com/auth/callback", // Required for OAuth
    },
  }}
  theme={darkTheme}
  appName="Your App Name"
  appIcon="/your-icon.png"
>
```

### OAuth Callback

The `/auth/callback` page handles OAuth flow automatically. The `PhantomProvider` 
processes the callback parameters when the page loads:

```javascript
import { usePhantom } from "@phantom/react-sdk";

function AuthCallbackPage() {
  const { isConnected, isLoading, connectError } = usePhantom();
  
  // Redirect once connected
  useEffect(() => {
    if (isConnected) router.push("/");
  }, [isConnected]);
  
  if (connectError) return <ErrorUI />;
  return <LoadingUI />;
}
```

### Signing Transactions

For embedded wallets (Google/Apple OAuth), use `signAndSendTransaction`:

```javascript
import { useSolana } from "@phantom/react-sdk";

function MyComponent() {
  const { solana, isAvailable } = useSolana();

  const handleTransaction = async (transaction) => {
    // Always check availability before calling
    if (!isAvailable || !solana?.signAndSendTransaction) {
      console.error("Solana provider not available");
      return;
    }

    const result = await solana.signAndSendTransaction(transaction);
    console.log("TX hash:", result.hash);
  };
}
```

> **Note**: Embedded wallets do NOT support `signTransaction` or `signAllTransactions`. 
> Use `signAndSendTransaction` which signs and broadcasts in a single step.

### Phantom Portal Setup

1. Go to [Phantom Portal](https://phantom.com/portal)
2. Create/select your app
3. Copy your App ID
4. Add your redirect URLs to the allowlist (e.g., `http://localhost:3000/auth/callback`)

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_PHANTOM_APP_ID` | App ID from Phantom Portal | Yes (for OAuth) |
| `NEXT_PUBLIC_SOLANA_RPC_URL` | Custom Solana RPC URL | No |
| `NEXT_PUBLIC_APP_URL` | Your app's URL (for OAuth callback) | No |

See `.env.example` for the template.

## Claude / AI Agent Setup

This starter works with the [Phantom MCP server](https://www.npmjs.com/package/@phantom/mcp-server), giving AI assistants like Claude direct access to your embedded wallet — checking balances, sending transactions, signing messages, and trading perpetuals on Hyperliquid.

### Setup (Claude Desktop)

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "phantom": {
      "command": "npx",
      "args": ["-y", "@phantom/mcp-server@latest"]
    }
  }
}
```

Restart Claude Desktop. On first use, a browser window opens to authenticate your Phantom wallet. No Phantom Portal App ID required — the MCP server handles its own authentication.

### Available tools (28)

**Wallet & balances**
- `get_connection_status` — Local connection check (no API call)
- `get_wallet_addresses` — Solana, Ethereum, Bitcoin, and Sui addresses
- `get_token_balances` — All token balances with live USD prices
- `get_token_allowance` — ERC-20 allowance for a spender on EVM

**Transactions**
- `send_solana_transaction` — Sign and broadcast a Solana transaction (with simulation preview)
- `send_evm_transaction` — Sign and broadcast an EVM transaction
- `transfer_tokens` — Transfer SOL, SPL tokens, or EVM native/tokens
- `buy_token` — Swap via Phantom routing (Solana, EVM, cross-chain)
- `simulate_transaction` — Preview asset changes without submitting

**Signing**
- `sign_solana_message` — Sign a UTF-8 message on Solana
- `sign_evm_personal_message` — EIP-191 personal sign on EVM
- `sign_evm_typed_data` — EIP-712 typed data (DeFi permits, order signing)

**Auth & misc**
- `phantom_login` — Trigger wallet authentication
- `pay_api_access` — Pay for API access
- `portfolio_rebalance` — Rebalance token portfolio

**Perpetuals — Hyperliquid (13 tools)**
- `deposit_to_hyperliquid` — Bridge tokens into your Hyperliquid perp account
- `get_perp_account` — Account balance and available margin
- `get_perp_markets` — Markets with price, funding rate, open interest, and max leverage
- `get_perp_positions` — Open positions with PnL and liquidation price
- `get_perp_orders` — Open limit, take-profit, and stop-loss orders
- `get_perp_trade_history` — Historical fills and closed PnL
- `open_perp_position` — Open a long/short with configurable leverage
- `close_perp_position` — Full or partial close via market order
- `cancel_perp_order` — Cancel an open order by ID
- `update_perp_leverage` — Change leverage and margin type (isolated/cross)
- `transfer_spot_to_perps` — Move USDC from Hypercore spot to perp
- `withdraw_from_perps` — Move USDC from perp back to spot
- `withdraw_from_hyperliquid_spot` — Withdraw from Hyperliquid spot to wallet

## License

ISC

## Learn More

- [Phantom React SDK](https://docs.phantom.com/sdks/react-sdk) - SDK documentation
- [Sign & Send Transactions](https://docs.phantom.com/sdks/react-sdk/sign-and-send-transaction) - Transaction signing guide
- [Connect Flow](https://docs.phantom.com/sdks/react-sdk/connect) - OAuth connection setup
- [Phantom Portal](https://phantom.com/portal) - App configuration
- [Next.js Documentation](https://nextjs.org/docs)
- [Solana Web3.js Documentation](https://solana-labs.github.io/solana-web3.js/)

