# RailAssist AI — Build Plan

This is a large enterprise platform. I'll build it in phases so each layer is solid and testable before the next. Everything uses your existing Supabase + Lovable AI (Gemini) — no mock data.

## Phase 1 — Foundation (Auth, Roles, Public Site)
- Design system: Railway Blue / Safety Orange tokens, dark/light mode, glassmorphism cards, premium typography
- Public website: Home (hero, features, AI capabilities, stats, workflow, contact), About, Features, Contact
- Auth: Supabase email/password login + Inspector registration form (name, employee ID, phone, zone, designation, photo)
- DB: `profiles`, `user_roles` (enum: super_admin, inspector), `inspectors` (pending/approved/rejected/suspended), `zones`, `stations`
- Super admin auto-assigned to vk1719676@gmail.com on first login
- Protected routes via `_authenticated` layout + role gates
- Inspector pending-approval screen

## Phase 2 — Core Incident Management
- DB: `incidents`, `incident_media`, `notifications`, `audit_logs` + storage buckets (incident-media, profile-photos, documents)
- Incident report form: type, severity, GPS, photo/video upload, station/zone
- Incident list, detail, status workflow (Reported → Under Review → Assigned → In Progress → Resolved)
- Inspector dashboard: My Incidents, Report Incident, History, Notifications, Profile
- Admin dashboard: Incident Management, Inspector Approval Center, Zone/Station CRUD

## Phase 3 — AI + Analytics
- Gemini-powered server function: analyze incident → risk score, severity, priority, action plan, ETA
- Smart Safety Dashboard: KPIs + Recharts (monthly, severity, zone, trends)
- AI Intelligence Center: insights feed (trend detection, high-risk stations, overdue maintenance)
- Predictive Maintenance: pattern detection over historical incidents

## Phase 4 — Maps, Maintenance, Documents
- Leaflet + OpenStreetMap: zones, stations, live incident markers, risk heatmap, filters
- Maintenance module: `maintenance_requests`, `maintenance_history`, workflow
- Document management: `documents` table + storage, preview/download/search
- Railway Digital Twin control-center dashboard

## Phase 5 — Advanced
- QR code generator for stations/tracks/equipment + scan-to-report
- Smart escalation (pg_cron job: 24h warning / 48h escalate / 72h critical)
- Advanced search & filters
- Reports & exports (PDF/Excel/CSV)
- PWA support + offline incident drafts
- Email notifications (Lovable Emails or Resend)

## Technical Details
- Stack: TanStack Start + React 19 + TS + Tailwind v4 + shadcn/ui + Supabase + Lovable AI Gateway (Gemini) + Leaflet + Recharts
- Server logic: `createServerFn` (not edge functions) for AI calls, escalation triggers, role-protected mutations
- Security: RLS on every table, `user_roles` table + `has_role()` security-definer fn (never store role on profiles), service role only in server fns
- Super admin email hardcoded as bootstrap trigger that assigns `super_admin` role on signup

## Questions Before Starting
1. **Starting point**: Approve Phase 1 first, or want me to push further in one go? Phase 1 alone is ~25-40 files.
2. **Email notifications**: Use built-in Lovable Emails (zero config, recommended) or connect Resend?
3. **Super admin account**: Should I create the account for vk1719676@gmail.com, or will you sign up yourself and the system auto-promotes you?
4. **AI**: Confirm using Lovable AI Gateway with `google/gemini-3-flash-preview` (no API key needed, billed via workspace credits).

Reply with answers and I'll start Phase 1 immediately.