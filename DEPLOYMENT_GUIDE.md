# 🌐 Complete Multi-Platform Deployment Guide
### YouTube Content HQ — Cloudflare Pages, Render & Vercel

This guide explains how to deploy **YouTube Content HQ** and connect it to your Cloudflare D1 database from **Cloudflare Pages**, **Render**, or **Vercel**.

---

## 📌 Summary: How Does It Connect to Cloudflare?

| Platform | Deployment Type | How It Connects to Cloudflare |
| :--- | :--- | :--- |
| **Cloudflare Pages** *(Recommended)* | Native Full-Stack | Native `env.DB` D1 Binding. 1-click connect in Cloudflare dashboard. Fastest, 100% free, 0ms latency. |
| **Render** | Node.js Web Service | Connects to Cloudflare D1 via the **Cloudflare D1 REST API** using `CF_ACCOUNT_ID`, `CF_DATABASE_ID`, and `CF_API_TOKEN`. |
| **Vercel** | Frontend / Serverless | Deploys frontend with proxy/rewrite to Render backend, or connects directly to Cloudflare Pages. |

---

## 🔑 Part 1: Getting Your Cloudflare Credentials

If deploying on Render or Vercel, you need 3 Cloudflare credentials to talk to Cloudflare D1 remotely:

1. **Cloudflare Account ID (`CF_ACCOUNT_ID`)**:
   - Log into [dash.cloudflare.com](https://dash.cloudflare.com).
   - Click on **Workers & Pages** in the sidebar.
   - Look at the right sidebar under **Account details** → copy your **Account ID**.

2. **D1 Database ID (`CF_DATABASE_ID`)**:
   - In Cloudflare Dashboard, go to **Storage & Databases** → **D1 SQL Database**.
   - Click your database `youtube-hq-db` (or create it with `npx wrangler d1 create youtube-hq-db`).
   - Copy the **Database ID** UUID (e.g. `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`).

3. **Cloudflare API Token (`CF_API_TOKEN`)**:
   - Go to [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens).
   - Click **Create Token** → Choose **Create Custom Token**.
   - Token Name: `YouTube-HQ-D1-Token`.
   - Permissions:
     - **Account** → **D1** → **Edit**
   - Click **Continue to summary** → **Create Token**.
   - Copy the generated API token.

---

## 🚀 Option A: Cloudflare Pages Deployment (Simplest & Best)

This connects directly to your GitHub repository and deploys both frontend and backend functions natively.

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**.
2. Select your repository: `saurabh0772/YouTube-Channels-Organizer`.
3. Set build settings:
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
4. Add D1 Binding:
   - After creation, go to **Settings** → **Functions** → **D1 database bindings**.
   - Variable name: `DB`
   - D1 database: `youtube-hq-db`
5. Set Environment Secret:
   - Go to **Settings** → **Environment variables**.
   - Add `AUTH_PASSCODE` with your owner passphrase.
6. Click **Save and Deploy**. Your site receives a free `*.pages.dev` URL!

---

## 🚀 Option B: Render Deployment (Full-Stack Node.js Server)

Render uses `server.js` and `render.yaml` included in this repository to run the app as a web service.

1. Log into [dashboard.render.com](https://dashboard.render.com).
2. Click **New +** → **Web Service**.
3. Select your repository: `saurabh0772/YouTube-Channels-Organizer`.
4. Configure settings:
   - **Name**: `youtube-content-hq`
   - **Environment**: `Node`
   - **Region**: Any (e.g. Singapore, Oregon, Frankfurt)
   - **Branch**: `main`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `node server.js`
   - **Plan**: `Free`
5. In **Environment Variables**, add:
   - `AUTH_PASSCODE`: `your_owner_passcode`
   - `CF_ACCOUNT_ID`: `your_cloudflare_account_id`
   - `CF_DATABASE_ID`: `your_d1_database_id`
   - `CF_API_TOKEN`: `your_cloudflare_api_token`
   - `NODE_ENV`: `production`
6. Click **Create Web Service**. Render will build the Vite frontend and start the Express server connected to your Cloudflare D1 database!

---

## 🚀 Option C: Vercel Deployment

1. Log into [vercel.com](https://vercel.com).
2. Click **Add New...** → **Project**.
3. Import `saurabh0772/YouTube-Channels-Organizer`.
4. Vercel automatically detects `vite.config.ts` and `vercel.json`:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Click **Deploy**.

---

## 📱 Accessing from Mobile (iPhone 13 & Android)

1. Open your live deployment URL on Safari (iPhone) or Chrome (Android).
2. Enter your passcode to authorize the device (remembered for 30 days).
3. Tap **"Add to Home Screen"** to use it like a native mobile app!
