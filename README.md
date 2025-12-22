
# THE JOURNEY: Pilgrim's Path
**Current Version:** v10.0 "Sovereign Stewardship"
**Status:** Live / Production Ready
**Stack:** React, Vite, Supabase, Google Gemini AI (Flash 2.5 + Live API)

---

## 🌟 OVERVIEW
**The Journey** is a comprehensive spiritual ecosystem combining gamified biblical education (RPG), a digital economy, and real-time community fellowship. It serves as a digital sanctuary for Christian devotions, offering AI-guided prayer and interactive scripture study.

### 🚀 Key Features (v10.0)

#### 🎮 Gameplay & Progression
*   **Pilgrim's Path (RPG)**: Navigate 3 campaigns (Pilgrim, David, Paul) and 9 circles of overcoming sin.
*   **Missions System**: Daily, Weekly, and Career quests to earn Spirit XP.
*   **Leaderboards**: Global ranking based on Net Worth (Liquid XP + Asset Value).

#### ⚒️ Divine Economy
*   **Sacred Forge**: Use Gemini AI to manifest unique, tradable Artifacts (Avatars/Sanctuaries).
*   **Marketplace**: Buy, sell, and burn artifacts. Includes 10% Treasury Tax and Auto-Listing protocols.
*   **Celestial Vault (Staking)**: Stake XP for APY yields (5% - 100%).
*   **Treasury**: A global fund collecting fees to redistribute rewards.

#### 🔥 Fellowship & Social
*   **Communities**: Join ministries, tithe XP to level up guilds, and share prayer requests.
*   **Prayer Room**: Real-time voice interaction with the 'Eternal Guide' using Gemini Live API.
*   **Journey TV**: Live broadcast simulation and video sharing.
*   **Global Chat**: Real-time fellowship with milestone announcements.

#### 🏛️ Governance & Support
*   **Admin Console**: Full user management, XP minting, and system broadcasts.
*   **Support Center**: Integrated ticketing system for user inquiries and bug reports.
*   **Raffles & Giveaways**: Host or enter community events with automated payouts.

---

## 🛡️ ADMIN PROTOCOLS
The system uses a Sovereign Admin model guarded by Row Level Security (RLS).

*   **Root Access**: Grants ability to mint XP, draw raffles, and manage bans.
*   **Console**: Accessible via Profile > Header (if role = 'admin').

---

## 🏗️ SETUP & INSTALLATION

### Prerequisites
1.  **Node.js** (v18+)
2.  **Supabase Project** (Database, Auth, Storage, Realtime)
3.  **Google Gemini API Key** (with Paid Tier for Live API)

### Quick Start
1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Create a `.env` file:
    ```env
    API_KEY=your_google_gemini_api_key
    ```
4.  **Database Sync**: Run the SQL scripts in the `supabase/` folder in order, or run `supabase_final_sync.txt` for a catch-all update.
5.  Start the development server:
    ```bash
    npm run dev
    ```

### Build for Production
```bash
npm run build
```

---

## 🪙 TOKENOMICS ($JOURNEY)
*   **Liquid XP**: Currency for actions (Forge, Broadcast, Tithing).
*   **Asset XP**: Value locked in NFTs/Artifacts.
*   **Net Worth**: The sum of Liquid + Assets + Staked. Used for Rankings.

---

## 🤝 CONTRIBUTING
We invite Kingdom builders to fork and contribute. 
*   **Frontend**: `components/`
*   **Logic**: `App.tsx` (State), `lib/supabase.ts` (DB)
*   **AI**: `services/geminiService.ts`

---
*Inspired by Faith. Built for Eternity.*
