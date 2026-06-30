# Home for AI — Mobile App

React Native (Expo) mobile companion to the Home for AI platform.
Dark-first deep space theme matching the web app.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native 0.74 + Expo SDK 51 |
| Routing | Expo Router v3 (file-based) |
| State | Zustand v4 |
| HTTP | Axios with JWT interceptor |
| Charts | Victory Native |
| Glassmorphism | expo-blur BlurView |
| Haptics | expo-haptics |
| Crypto | expo-crypto (AES-256 helpers) |
| Lists | @shopify/flash-list |
| Language | TypeScript strict |

---

## Quick Start

### Prerequisites

- Node.js 20+
- Expo CLI: `npm install -g expo-cli`
- EAS CLI (for builds): `npm install -g eas-cli`
- For iOS dev: macOS + Xcode 15+
- For Android dev: Android Studio + SDK 34

### 1. Install dependencies

```bash
cd home-for-ai-mobile
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
# Edit .env.local and set API_BASE_URL to your backend
```

### 3. Start development server

```bash
npx expo start
```

Then press:
- `i` to open in iOS Simulator
- `a` to open in Android emulator
- Scan QR code with **Expo Go** app on a physical device

---

## Project Structure

```
home-for-ai-mobile/
├── app/
│   ├── _layout.tsx              # Root layout (GestureHandler, SafeArea, dark theme)
│   ├── (tabs)/
│   │   ├── _layout.tsx          # Bottom tab navigator
│   │   ├── index.tsx            # Workshop screen — 8 AI agent cards
│   │   ├── market.tsx           # Market screen — country indices with flags
│   │   ├── trade.tsx            # Trading terminal (order book, chart, form)
│   │   ├── wallet.tsx           # Crypto wallet — balances, send/receive
│   │   └── settings.tsx         # Settings (security, notifications, account)
│   └── modal/
│       ├── agent-detail.tsx     # Agent detail modal (P&L, copy toggle, chat)
│       ├── trade-confirm.tsx    # Order confirmation bottom sheet
│       └── send-crypto.tsx      # Send crypto (address, amount, PIN) 4-step
├── components/
│   ├── AgentCard.tsx            # Cat agent card with copy-trade toggle
│   ├── CatAvatar.tsx            # Emoji avatar with active glow ring
│   ├── GlassCard.tsx            # expo-blur glassmorphism card
│   ├── MarketTicker.tsx         # Horizontal scrolling price ticker
│   ├── OrderBook.tsx            # Bid/ask depth table
│   ├── PriceChart.tsx           # Victory Native price chart
│   ├── SecurityBadge.tsx        # AES-256 / 2FA badge
│   └── SparkLine.tsx            # react-native-svg sparkline
├── hooks/
│   ├── useAgents.ts             # Fetches from API_BASE_URL/api/agents
│   ├── useMarket.ts             # Market data + refresh
│   ├── useWallet.ts             # Wallet state from walletStore
│   └── useWebSocket.ts          # WS connection to API_BASE_URL/ws/{clientId}
├── lib/
│   ├── api.ts                   # Axios client + JWT interceptor
│   ├── crypto.ts                # expo-crypto AES-256 helpers + BIP-39 50 words
│   └── theme.ts                 # Colors, fonts, spacing (Deep Space design system)
├── store/
│   ├── agentStore.ts            # Zustand: agent list + copy-enabled IDs
│   ├── walletStore.ts           # Zustand: token balances + totals
│   └── tradeStore.ts            # Zustand: orders + positions
├── assets/
│   ├── icon.png                 # 512×512 app icon (replace placeholder)
│   ├── splash.png               # Splash screen (replace placeholder)
│   └── adaptive-icon.png        # Android adaptive icon (replace placeholder)
├── app.json                     # Expo config
├── babel.config.js              # Babel with reanimated plugin
├── tsconfig.json                # TypeScript strict config
└── .env.example                 # Environment variable template
```

---

## Design System

### Colors (Deep Space Theme)

| Name | Hex | Usage |
|---|---|---|
| Background | `#050508` | App background |
| Accent (Indigo) | `#4F46E5` | Primary action, active states |
| Teal | `#06B6D4` | Data visualization, secondary accent |
| Gold (Profit) | `#F59E0B` | Positive P&L, profit indicators |
| Red (Loss) | `#EF4444` | Negative P&L, loss indicators |

### Typography

- **Display headings**: Space Grotesk (load via expo-google-fonts)
- **Body text**: Inter
- **Numbers / code**: JetBrains Mono

> Font loading: Add `expo-font` and `@expo-google-fonts/space-grotesk` etc., then load in `app/_layout.tsx` using `useFonts()`.

### Glassmorphism

`GlassCard` uses `expo-blur` `BlurView` with `intensity=20` and `tint='dark'`, layered over a semi-transparent background. Border: `rgba(255,255,255,0.07)`.

---

## Building for Distribution

### Prerequisites

Log in to EAS and initialize the project:

```bash
eas login
eas build:configure
```

Set your EAS Project ID in `app.json` → `expo.extra.eas.projectId`.

### Android (APK / AAB)

**Preview build** (APK for testing):
```bash
npm run build:android
# or:
eas build --platform android --profile preview
```

**Production build** (AAB for Play Store):
```bash
eas build --platform android --profile production
```

### iOS (IPA)

**Preview build** (Ad Hoc for TestFlight):
```bash
npm run build:ios
# or:
eas build --platform ios --profile preview
```

**Production build** (App Store):
```bash
eas build --platform ios --profile production
```

---

## Submitting to Stores

### Google Play

```bash
npm run submit:android
# or:
eas submit --platform android
```

You will be prompted for a service account JSON key. Set it as an EAS secret:
```bash
eas secret:create --scope project --name GOOGLE_PLAY_KEY --type file --value ./google-play-key.json
```

#### Google Play Store Listing Fields

| Field | Value |
|---|---|
| App name | Home for AI |
| Short description (80 chars) | AI-powered trading agents — crypto, stocks, bonds & commodities |
| Full description | Full AI trading platform in your pocket. Manage 8 autonomous trading agents, monitor global markets across 12 countries, trade crypto and stocks with a professional order book, and manage your multi-asset wallet with AES-256 encryption and 2FA. Copy-trade top-performing agents automatically. |
| Category | Finance |
| Content rating | Everyone |
| Package name | com.homeforai.app |
| Target SDK | 34 |

### App Store Connect (iOS)

```bash
npm run submit:ios
# or:
eas submit --platform ios
```

#### App Store Connect Fields

| Field | Value |
|---|---|
| App Name | Home for AI |
| Subtitle (30 chars) | AI Trading Agents Platform |
| Category | Finance |
| Secondary Category | Utilities |
| Bundle ID | com.homeforai.app |
| Privacy Policy URL | https://homeforai.app/privacy |
| Keywords | trading, AI, crypto, bitcoin, stocks, portfolio, agents, bot, investing |
| Description | Home for AI brings your AI trading agents to your iPhone. Monitor 8 autonomous agents, view live global market data, execute trades with a full-featured terminal, and manage your multi-asset wallet — all secured with AES-256 encryption and biometric authentication. |
| What's New | Initial release |
| Support URL | https://homeforai.app/support |

---

## Required EAS Secrets

Set these in your EAS project dashboard or via CLI:

| Secret name | Description | How to set |
|---|---|---|
| `EXPO_APPLE_ID` | Your Apple ID email | `eas secret:create --name EXPO_APPLE_ID --value you@example.com` |
| `EXPO_APPLE_TEAM_ID` | Apple Developer Team ID (10 chars) | `eas secret:create --name EXPO_APPLE_TEAM_ID --value XXXXXXXXXX` |
| `GOOGLE_PLAY_KEY` | Google Play service account JSON file | `eas secret:create --name GOOGLE_PLAY_KEY --type file --value ./key.json` |

---

## EAS Build Profiles (`eas.json`)

Create `eas.json` at the project root:

```json
{
  "cli": {
    "version": ">= 10.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" },
      "ios": { "simulator": false }
    },
    "production": {
      "android": { "buildType": "app-bundle" },
      "ios": {}
    }
  },
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./google-play-key.json",
        "track": "internal"
      },
      "ios": {
        "appleId": "your@apple.id",
        "ascAppId": "YOUR_APP_STORE_CONNECT_APP_ID",
        "appleTeamId": "XXXXXXXXXX"
      }
    }
  }
}
```

---

## API Integration

The app connects to the Home for AI Express backend (`home-for-ai-ui`).

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/agents` | GET | Fetch agent list |
| `/api/wallet/balances` | GET | Fetch token balances |
| `/ws/{clientId}` | WS | Real-time price/agent updates |

Set `API_BASE_URL` in `.env.local` to point to your backend:
- Local: `http://localhost:3000`
- Production: `https://api.homeforai.app`

---

## Security Notes

- All API requests include a JWT Bearer token via Axios interceptor
- In production, store the JWT in `expo-secure-store` (add `expo-secure-store` dependency)
- PIN is hashed with SHA-256 + salt before storage
- AES-256 encryption stubs in `lib/crypto.ts` — integrate `react-native-quick-crypto` for full implementation
- 2FA uses TOTP — integrate `otplib` or a server-side TOTP endpoint

---

## Troubleshooting

**Metro bundler issues:**
```bash
npx expo start --clear
```

**Android build fails with Gradle error:**
```bash
cd android && ./gradlew clean && cd ..
```

**`reanimated` warnings on startup:**
Ensure `react-native-reanimated/plugin` is listed first in `babel.config.js` plugins.

**BlurView not working on Android < 12:**
`expo-blur` falls back to a semi-transparent background on older Android. This is expected.
