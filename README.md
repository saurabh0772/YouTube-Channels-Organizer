# 🎬 YouTube Content HQ

A personal, production-ready multi-channel YouTube content management application built for **100% FREE hosting and database tiers** on Cloudflare Pages Functions + Cloudflare D1 (SQLite).

Designed specifically for creators managing multiple YouTube channels across an **Ubuntu laptop**, an **iPhone 13**, and an **Android smartphone**.

---

## ⚡ The Ultimate Workflow

```
1. Create video & thumbnail on Ubuntu laptop
2. Upload video & thumbnail to Google Drive
3. Open YouTube Content HQ
4. Select Channel (e.g. Toon Rivora)
5. Tap "New Video" → Paste Drive Links, YouTube Title, Description, Tags
6. Save → Instantly synchronized to Cloudflare D1
7. Open YouTube Content HQ on iPhone or Android
8. Tap anywhere on Title / Description / Tags → Instantly copied to clipboard
9. Paste into the YouTube Studio app for effortless upload!
```

---

## 🚀 Key Features

- **100% Free Tier Architecture**:
  - **Frontend**: React 18, Vite, Tailwind CSS, Lucide React icons.
  - **Hosting**: Cloudflare Pages (Free tier with custom or free `*.pages.dev` subdomain).
  - **Backend**: Cloudflare Pages Functions (V8 Workers runtime, serverless, zero paid servers).
  - **Database**: Cloudflare D1 SQLite database (Distributed, persistent, free tier).
- **Google Drive Aesthetics**:
  - Google Drive style folders for channels: **Toon Rivora**, **Techno Slayer**, **Rule Breaker**, **SSC Vertex**.
  - Folder cards show channel name and video counts.
  - Channels can be added, renamed, or deleted.
- **Cross-Device Cloud Synchronization**:
  - Real-time database-backed sync across laptop and smartphones.
  - Auto-refreshes when returning to tab or window focus (`document.visibilitychange`).
  - Active-tab periodic background polling (every 25 seconds).
  - Manual instant refresh button with visual sync indicators (Syncing / Synced / Error).
  - Sequence protection to prevent stale responses from overwriting newer changes.
- **First-Class Tap-to-Copy UX**:
  - **YouTube Title**: Tap anywhere on the card to copy the entire title.
  - **YouTube Description**: Tap anywhere to copy the full description verbatim—preserving all line breaks, blank lines, emojis, hashtags (`#tags`), and special characters.
  - **YouTube Tags**: Tap anywhere to copy all tags.
  - **Google Drive Links**: Quick "Open in New Tab" and "Copy Link" buttons for video and thumbnail.
  - Embedded high-res thumbnail preview with automatic Google Drive preview generation and graceful fallback.
- **Safe Video Numbering**:
  - Automatically assigns unique sequential numbers per channel (e.g., Video 15, Video 14...).
  - Deleted video numbers are **never reused**, preserving sequence history.
  - Editing metadata never alters assigned video numbers.
  - Sort by newest created first, oldest first, last updated, or video number.
- **Passcode Access Security (No Account Login)**:
  - Private access passcode system (one owner passcode).
  - Cryptographically hashed sessions stored in Cloudflare D1.
  - Secure, HttpOnly, SameSite=Lax session cookies (remembers authorized devices for 30 days).
  - Timing-safe passcode verification.
  - Persistent login-attempt rate limiting (locks after 5 failed attempts for 15 minutes).
  - One-click Lock / Logout to revoke session.
  - CSRF and cross-origin request protection.
- **JSON Backup & Restore**:
  - One-click JSON backup export and download.
  - Restore with format validation and choice of **Merge Mode** or **Replace Mode**.

---

## 🛠️ Tech Stack & Directory Structure

```
Channel Organizer/
├── functions/                     # Cloudflare Pages Functions (Backend API)
│   ├── _middleware.ts             # Security headers, CORS, and CSRF protection
│   ├── api/
│   │   ├── auth/
│   │   │   ├── unlock.ts          # Passcode verification & session issuance
│   │   │   ├── session.ts         # Session validity check
│   │   │   └── logout.ts          # Session revocation & cookie wipe
│   │   ├── channels/
│   │   │   ├── index.ts           # GET channels / POST create channel
│   │   │   └── [id].ts            # PATCH rename / DELETE channel
│   │   ├── channels/[id]/
│   │   │   └── videos.ts          # GET list (search/sort) / POST create video
│   │   ├── videos/
│   │   │   └── [id].ts            # GET details / PATCH edit / DELETE video
│   │   ├── export.ts              # GET JSON backup
│   │   └── import.ts              # POST JSON restore (merge/replace)
│   └── utils/
│       ├── types.ts               # D1 and API type definitions
│       ├── crypto.ts              # Web Crypto SHA-256 and constant-time compare
│       ├── auth.ts                # Session verification & rate limiting
│       ├── initDb.ts              # Auto-seed of initial 4 channels
│       └── response.ts            # Typed JSON responses
├── migrations/
│   └── 0001_initial.sql           # D1 SQLite database schema & indexes
├── src/                           # React 18 Frontend
│   ├── components/                # Drive folder cards, Video list, Detail view, Modals
│   ├── context/                   # AuthContext, ThemeContext, ToastContext
│   ├── hooks/                     # useSync cross-device auto-sync hook
│   ├── services/                  # api.ts client requests
│   ├── utils/                     # clipboard.ts, drive.ts
│   ├── App.tsx                    # Main app layout and routing
│   └── main.tsx                   # React root
├── wrangler.toml                  # Cloudflare Pages & D1 binding configuration
├── vite.config.ts                 # Vite bundler configuration
└── package.json
```

---

## 💻 Ubuntu Linux Setup & Local Development

### 1. Prerequisites

Ensure Node.js (v18+) and npm are installed on your Ubuntu machine:

```bash
node -v
npm -v
```

If not installed:
```bash
sudo apt update
sudo apt install -y curl
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### 2. Install Project Dependencies

From the project root:
```bash
npm install
```

### 3. Initialize Local Cloudflare D1 Database

Run the initial database migration locally:
```bash
npm run d1:init
```
*(This creates the local SQLite database in `.wrangler/state/v3/d1` and seeds the 4 channels: Toon Rivora, Techno Slayer, Rule Breaker, SSC Vertex).*

### 4. Build the Frontend

```bash
npm run build
```

### 5. Start the Local Server

Run the Cloudflare Pages local development server (with D1 bound to Pages Functions):

```bash
npx wrangler pages dev dist --compatibility-date=2024-04-01 --d1=DB=youtube-hq-db --port=8788
```

Open your browser to:
```
http://localhost:8788
```

> **Default Local Passcode:** In local testing when no server secret is set, the default passcode is `admin123`.

---

## 🌐 Production Deployment to Cloudflare Pages (100% FREE)

Deploying takes about 3 minutes using the Cloudflare CLI (`wrangler`).

### Step 1: Login to Cloudflare

In your Ubuntu terminal:
```bash
npx wrangler login
```
*A browser window will open asking you to authorize Wrangler with your free Cloudflare account.*

### Step 2: Create your Cloudflare D1 Production Database

Run:
```bash
npx wrangler d1 create youtube-hq-db
```

Wrangler will output something like:
```toml
[[d1_databases]]
binding = "DB"
database_name = "youtube-hq-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

Copy the generated `database_id` into your `wrangler.toml` file under `database_id`:
```toml
[[d1_databases]]
binding = "DB"
database_name = "youtube-hq-db"
database_id = "your-actual-database-id-here"
```

### Step 3: Apply Database Migrations in Production

Run:
```bash
npx wrangler d1 execute youtube-hq-db --remote --file=./migrations/0001_initial.sql
```
*This creates the `channels`, `videos`, `sessions`, and `rate_limits` tables and seeds the 4 channels.*

### Step 4: Configure your Secret Passcode

Set your private owner passcode as an encrypted server-side secret (never exposed to frontend code):

```bash
npx wrangler pages secret put AUTH_PASSCODE --project-name youtube-content-hq
```
*When prompted, type your chosen strong owner passcode (e.g. `MySecurePasscode2026!`).*

### Step 5: Build and Deploy to Cloudflare Pages

```bash
npm run build
npx wrangler pages deploy dist --project-name youtube-content-hq
```

After deployment, Cloudflare will output your live URL:
```
✨ Success! Uploaded files to Cloudflare Pages!
🌍 https://youtube-content-hq.pages.dev
```

### Step 6: Bind the D1 Database in Cloudflare Dashboard

To connect your D1 database to Pages Functions:
1. Go to the [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages**.
2. Click on your project: **youtube-content-hq**.
3. Go to **Settings** → **Functions** → **D1 database bindings**.
4. Click **Add binding**:
   - Variable name: `DB`
   - D1 database: `youtube-hq-db`
5. Click **Save and Deploy**.

---

## 📱 Accessing from iPhone 13 & Android Smartphone

1. Open Safari (on iPhone 13) or Chrome (on Android).
2. Navigate to your website URL:
   ```
   https://youtube-content-hq.pages.dev
   ```
3. Enter your private passcode once.
4. **Add to Home Screen (PWA experience)**:
   - **iPhone (Safari)**: Tap the Share button at the bottom → Tap **"Add to Home Screen"**.
   - **Android (Chrome)**: Tap the 3 dots menu at top right → Tap **"Add to Home screen"** or **"Install app"**.
5. It will now launch like a native full-screen app on both phones with instant one-tap copy and continuous database sync!

---

## 🔄 Updating the Deployed Website

Whenever you make improvements or changes in the code:

```bash
# 1. Build the updated frontend
npm run build

# 2. Deploy to Cloudflare Pages
npx wrangler pages deploy dist --project-name youtube-content-hq
```

That's it! Your updates will immediately appear on your laptop, iPhone, and Android device.

---

## 🛡️ Security Features Checklist

- [x] No plaintext passwords in code or frontend repository.
- [x] Server-side secret validation with constant-time comparison against timing attacks.
- [x] Cryptographically random session tokens (256-bit entropy).
- [x] SHA-256 token hashing in database (protects sessions against DB dumps).
- [x] HttpOnly, Secure, SameSite=Lax cookie storage.
- [x] Persistent rate limiting against brute force attempts (locked after 5 attempts).
- [x] CSRF verification on state-changing requests (`POST`, `PATCH`, `DELETE`).
- [x] Zero anonymous access to channel or video metadata.

