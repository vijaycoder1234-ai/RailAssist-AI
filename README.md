# 🚆 RailAssist AI — Railway Incident Intelligence Platform

> **Making Railways Safer, Smarter, and More Efficient.**
> An enterprise-grade control center for railway incident management, AI-powered risk analysis,
> predictive maintenance, and live safety monitoring — purpose-built for modern transport authorities.

![Stack](https://img.shields.io/badge/stack-TanStack%20Start%20%2B%20React%2019-blue)
![Backend](https://img.shields.io/badge/backend-Supabase-3ecf8e)
![AI](https://img.shields.io/badge/AI-Gemini%20via%20Lovable%20AI%20Gateway-purple)
![Deploy](https://img.shields.io/badge/deploy-Cloudflare%20Workers-orange)

---

## ✨ Highlights (Hackathon Pitch)

- **🧠 AI Risk Analysis** — every incident is auto-scored 0–100 by Google Gemini with severity, categories, and a recommended action plan.
- **⚡ Realtime Everything** — incidents, maintenance tasks, notifications, map markers, counters & resolution stats update **live** via Supabase Realtime — no page reload needed.
- **🗺️ Live Railway Map** — OpenStreetMap with severity-coloured incident clustering, station fallback coordinates, filters, and legend.
- **🔔 Hybrid Notification System** — native browser notifications with automatic in-app fallback when permission is denied.
- **🛠️ Maintenance Assignment Workflow** — super admins assign incidents to maintenance staff; status & SLA tracked end-to-end.
- **📄 One-Click PDF Reports** — clean, printable incident and maintenance reports.
- **🔒 Role-Based Security** — `super_admin`, `inspector`, `maintenance` roles enforced via Postgres RLS + a `has_role()` security-definer function (no privilege escalation surface).
- **📱 Field-First UX** — mobile hamburger nav, QR-driven incident capture, skeleton loaders, empty/error states with retry.
- **📊 Animated Live KPIs** — count-up dashboard tiles backed by real Supabase data.

---

## 🏗️ Tech Stack

| Layer | Choice |
|---|---|
| Framework | TanStack Start v1 (React 19, file-based routing, SSR) |
| Build | Vite 7 |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Backend | Supabase (Postgres, Auth, Realtime, RLS) |
| Server logic | `createServerFn` (TanStack server functions) |
| AI | Google Gemini via Lovable AI Gateway |
| Maps | Leaflet + OpenStreetMap |
| PDF | jsPDF |
| Deploy target | Cloudflare Workers (Edge) |

---

## 🚀 Getting Started

```bash
# install
bun install

# dev
bun dev

# build
bun run build
```

### Required env vars

Browser (auto-populated by Lovable Cloud):
```
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_SUPABASE_PROJECT_ID=
```

Server (set in Lovable Cloud → Secrets):
```
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
LOVABLE_API_KEY=   # for Gemini via AI Gateway
```

---

## 🗂️ Project Structure

```
src/
├── routes/                       # file-based routes (TanStack Start)
│   ├── __root.tsx                # root layout
│   ├── index.tsx                 # public landing + live KPIs
│   ├── _authenticated/           # protected subtree (auth gate)
│   │   ├── dashboard.tsx         # inspector workspace
│   │   ├── incidents.tsx         # incident list, map, AI panel, PDF
│   │   ├── maintenance.tsx       # maintenance tasks
│   │   ├── admin.tsx             # super-admin console
│   │   ├── analytics.tsx
│   │   ├── stations.tsx
│   │   └── assets.tsx
│   └── auth.tsx / auth.pending.tsx
├── components/
│   ├── incident-map.tsx          # Leaflet map + clustering + legend
│   ├── notification-bell.tsx     # in-app notification fallback
│   ├── app-shell.tsx             # responsive shell + mobile nav
│   └── ui/                       # shadcn primitives
├── hooks/
│   ├── use-auth.tsx
│   ├── use-count-up.ts           # animated counters
│   └── use-realtime-invalidate.ts# Supabase Realtime subscription helper
├── lib/
│   ├── ai-incident.functions.ts  # Gemini analysis server fn
│   ├── public-stats.functions.ts # admin-elevated public KPIs
│   ├── incident-pdf.ts           # PDF generation
│   └── notifications.ts          # browser + DB notifications
└── integrations/supabase/
    ├── client.ts                 # browser client (anon key)
    ├── client.server.ts          # server admin client (service role)
    └── auth-middleware.ts        # requireSupabaseAuth
```

---

## 🔐 Roles & Security

Roles live in a dedicated `user_roles` table (never on `profiles`) and are checked
through a `SECURITY DEFINER` function `public.has_role(_user_id, _role)`. All
user-facing tables have RLS enabled with policies scoped to `auth.uid()` or
`has_role()`. The service-role key is **never** exposed to the browser — it is
used only inside `createServerFn` handlers via `await import("@/integrations/supabase/client.server")`.

---

## 📡 Realtime Architecture

Supabase Realtime is enabled on:

- `public.incidents`
- `public.maintenance_tasks`
- `public.notifications`

A small hook subscribes and triggers cache/loader invalidation:

```ts
useRealtimeInvalidate(["incidents", "maintenance_tasks"], () => load());
```

Result: dashboards, map markers, counters, and resolution rates update
**within milliseconds** of any insert / update / delete — across all open browser tabs.

---

## 🧠 AI Pipeline

1. Inspector submits an incident (title, description, optional GPS / media).
2. `analyzeIncident` server function calls Gemini via the Lovable AI Gateway.
3. The model returns strict JSON: `summary`, `severity`, `risk_score (0–100)`,
   `suggested_actions[]`, `categories[]`.
4. Results are persisted back to the incident row and logged in `ai_runs`.
5. The UI shows a circular risk gauge, recommended actions, and an
   "estimated resolution time" tile.

---

## 📦 Key Features Implemented

- ✅ Public landing with live KPIs (incidents, resolved, inspectors, resolution rate)
- ✅ Inspector registration + super-admin approval flow
- ✅ Incident report with category, severity, GPS, photos
- ✅ Gemini AI risk scoring + action plan
- ✅ Interactive map with clustering, severity filters, legend
- ✅ Maintenance team assignment with status tracking
- ✅ Browser notifications + in-app fallback bell
- ✅ One-click PDF download (incidents & maintenance)
- ✅ Mobile responsive (hamburger nav, sheet menu)
- ✅ Skeleton loaders, empty states, retry buttons
- ✅ Cloudflare Workers deployment configuration

---

## 🛣️ Roadmap

- Predictive maintenance ML (failure forecasting from `maintenance_logs`)
- WhatsApp / SMS escalation channel
- Multi-language support (Hindi, Tamil, Bengali)
- Drone & CCTV feed ingestion for automatic incident detection
- Public passenger reporting portal with moderation queue

---

## 🏆 Why It Wins

RailAssist AI is **not a prototype** — it is a working, secure, multi-role, realtime
platform that addresses an urgent real-world problem: railway safety in one of the
world's largest networks (Indian Railways: 70K+ track km, 8,300+ stations, 23M daily
passengers). Every line of the stack — RLS, server functions, AI, realtime, PDF,
notifications, mobile UX — is production-grade and built on Lovable Cloud + Lovable
AI Gateway.

> **Built with ❤️ on [Lovable](https://lovable.dev).**
