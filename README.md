# Tambluu1 – Multi-Tenant Tambola Platform

A Next.js App Router frontend serving multiple tenants from a single deployment. This monorepo powers three distinct experiences based on URL paths and authentication roles:
- **Public Player Board** (`/`): Realtime game viewing and ticket checking.
- **Admin Portal** (`/admin`): Full game management, agent tracking, poster creation, and theme configuration.
- **Agent Portal** (`/agent`): Restricted dashboard for booking tickets and viewing personal sales performance.

## 🚀 How to Run Locally

Because this platform resolves tenants based on the incoming hostname, local development requires overriding the domain lookup since `localhost` isn't a registered tenant domain.

1. **Environment Setup:**
   Copy `.env.example` to `.env.local` and fill in your Supabase and API URLs.
   ```bash
   cp .env.example .env.local
   ```

2. **Start the Development Server:**
   ```bash
   npm run dev
   ```

3. **Accessing with a Local Override:**
   To force the middleware to load a specific tenant during local testing, append the `?tenant=` query parameter to your localhost URL with your tenant's ID:
   ```text
   http://localhost:3000/?tenant=YOUR-TENANT-ID
   ```
   *Note: Once the middleware intercepts this query param on localhost, it caches the resolved `tenantId` in memory, so subsequent navigations won't strictly need the parameter.*

## 📁 Folder Structure

```text
app/
├── (public)/                 # Public Player Portal
│   ├── _components/          # Live board, tickets grid, realtime UI
│   └── page.tsx              # Player-facing game page
│
├── admin/
│   ├── (protected)/          # Admin Dashboard (Requires 'admin' role)
│   │   ├── agents/           # Agent management & performance
│   │   ├── booking-requests/ # Manual ticket approval workflow
│   │   ├── games/            # Game list, edit, dividends, and Runner
│   │   ├── poster-maker/     # Canvas-based promo generator
│   │   ├── theme/            # Theme grid & live preview
│   │   └── page.tsx          # Main dashboard summary
│   │
│   ├── login/                # Admin auth flow
│   └── layout.tsx            # Auth guards for /admin
│
├── agent/
│   ├── (protected)/          # Agent Dashboard (Requires 'agent' role)
│   │   └── page.tsx          # Ticket booking & earnings summary
│   │
│   ├── login/                # Agent auth flow
│   └── layout.tsx            # Auth guards for /agent
│
├── api/                      # Next.js route handlers
├── layout.tsx                # Global layout (Providers, Fonts)
└── middleware.ts             # Edge Middleware (Tenant resolution & routing)

src/
├── components/               # Shared UI (Shell, Sidebar, Toasts, Auth Buttons)
├── lib/                      # Utilities (Supabase client, API wrapper, auth helpers)
└── types/                    # TypeScript interfaces for all payloads/responses
```

## 🌍 The "One Deployment, Many Domains" Architecture

This app relies on **Vercel's Edge Middleware** to act as a multi-tenant router. 
There is only **one** codebase and **one** deployment.

**Bringing a new tenant online requires zero code changes:**
1. The tenant registers their custom domain (e.g., `play.theirbrand.com`).
2. Add that custom domain to the Vercel Project Settings.
3. Add the domain to the backend database.
4. When a request comes in to `play.theirbrand.com`, the Next.js `middleware.ts` intercepts it, reads the `Host` header, queries the backend to find the matching `tenantId`, and attaches it via the `x-tenant-id` request header. All downstream Server Components pull this ID automatically.

## ⚠️ Known Gaps & Backend Checklist

Throughout the frontend development, several API endpoints and JSON response structures were assumed. **Before moving to production, please confirm the backend implements the following contracts:**

### 1. Agent Performance Join
* **File:** `app/admin/(protected)/agents/page.tsx`
* **Assumed Endpoint:** `GET /tenants/:id/agents` (or similar performance join)
* **Assumed Shape:** Needs to return `total_tickets_sold`, `total_revenue`, `agent_earnings`, and `admin_net_profit` in the same object.

### 2. Manual Agent Bookings
* **File:** `app/agent/(protected)/page.tsx`
* **Assumed Endpoint:** `POST /tenants/:id/games/:gameId/tickets/:ticketNumber/book`
* **Note:** The UI currently assumes the URL takes the `ticketNumber` directly (e.g. `42`) to book it, rather than requiring the frontend to first fetch and look up the UUID `ticketId`.

### 3. Theme Logo Upload
* **File:** `app/admin/(protected)/theme/_components/ThemeClient.tsx`
* **Status:** Currently a UI stub.
* **Requirement:** Needs a Supabase Storage bucket configured and a backend endpoint (or direct Supabase client call) to handle multipart file uploads and return a public URL to save into `themeOverrides`.

### 4. Poster Maker Layout Structure
* **File:** `app/admin/(protected)/poster-maker/_components/CanvasEditor.tsx`
* **Assumed Shape:** The `layout.jsonb` field inside `PosterTemplate` is assumed to contain a `fields` array where each object has explicit `x`, `y`, `fontSize`, `color`, and `align` properties to calculate the Canvas text bounding boxes accurately.

### 5. Game Runner Engine Endpoints
* **File:** `app/admin/(protected)/games/[gameId]/run/_components/GameRunnerClient.tsx`
* **Assumed Endpoints:** `POST /run`, `POST /pause`, `POST /complete`, and `POST /call-next` nested under `/games/:gameId`. Ensure these accurately trigger the cron job / backend state machine.