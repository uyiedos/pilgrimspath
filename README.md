
# THE JOURNEY: Pilgrim's Path
**Status:** v9.5 Milestone (Global Economy & Events)
**Focus:** Christian Devotions, Biblical Adventure, Real-time Community & Spiritual Growth.

---

## 🌟 OVERVIEW
**The Journey** is a spiritual text-adventure and community platform built on React, Supabase, and Google Gemini AI. It combines gamified biblical education with real-world spiritual disciplines.

### Key Features
*   **Pilgrim's Path**: An AI-guided text adventure through 9 circles of overcoming sin.
*   **Sacred Forge**: Generate unique 3D/Pixel Art artifacts using Spirit XP (Gemini AI).
*   **Prayer Room**: Real-time vocal counseling with the 'Eternal Guide' (Gemini Live API).
*   **Fellowship**: Join ministries (guilds), tithe XP, and share prayers on the community wall.
*   **Marketplace**: Trade forged artifacts with other pilgrims.
*   **Events**: Host community giveaways or enter official raffles.
*   **$JOURNEY**: Upcoming Solana token integration for governance and utility.

---

## 🛡️ ADMIN PROTOCOLS
The system uses a Sovereign Admin model.
- **Root Admin:** `uyiedos@gmail.com` (Username: `blackralph`)
- **Capabilities:**
  - Grant Spirit XP (Minting)
  - Create Official Raffles
  - Draw Raffle Winners
  - Send Emergency Broadcasts
  - Manage User Roles

To promote a user to Admin, use the **Admin Console** (accessible only to existing Admins) or run the SQL script `supabase_admin_genesis.txt`.

---

## 🏗️ SETUP & INSTALLATION

### Prerequisites
1.  **Node.js** (v18+)
2.  **Supabase Project** (Database & Auth)
3.  **Google Gemini API Key**

### Installation
1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Create a `.env` file in the root directory:
    ```env
    API_KEY=your_google_gemini_api_key
    ```
4.  Start the development server:
    ```bash
    npm run dev
    ```

### Database Migration
This app relies on specific Supabase tables and RPCs.
1.  Go to your Supabase SQL Editor.
2.  Run the content of `supabase_master_migration.txt`.
3.  (Optional) Run `supabase_admin_genesis.txt` to set the initial admin.

---

## 🗺️ APP STRUCTURE

### Core Components
- `App.tsx`: Main state manager and router.
- `components/GameView.tsx`: The core gameplay loop (AI text adventure).
- `components/ForgeView.tsx`: AI Image Generation interface.
- `components/PrayerRoomView.tsx`: Real-time audio interface (Live API).
- `components/CommunityView.tsx`: Social feed and guild management.
- `components/MarketplaceView.tsx`: P2P trading system.
- `components/GiveawaysView.tsx`: User-hosted raffle system.

### Services
- `services/geminiService.ts`: Handles all text/image generation calls.
- `lib/supabase.ts`: Database client configuration.
- `utils/audio.ts`: Web Audio API synthesizer for sound effects.

---

## 🪙 ECONOMY & TOKEN
- **Spirit XP**: The internal currency earned via gameplay, devotionals, and community interaction.
- **$JOURNEY**: A planned Solana token for governance and premium features.
- **Treasury**: A global pool that collects fees (Marketplace tax, Giveaway creation fees) to fund community rewards.

---

## 🤝 PARTNERSHIPS
We invite ministries and creators to partner with us.
- **Sponsor Raffles**: Donate prizes to the community.
- **Sustainable Giving**: Support server/AI costs to keep the Journey free.

---
*Inspired by Faith. Developed for the Seeker.*
