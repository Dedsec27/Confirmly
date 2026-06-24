# Confirmly — Live QR customer sync (v39)

## What this fixes

v38 showed “profile created” even when the public QR page could not reach a configured database. On a customer’s phone, its fallback was saved only in that phone’s browser storage, so it could never appear in the shop dashboard.

v39 removes that false-success path:
- The QR form only confirms success after the server has stored the customer.
- The dashboard loads QR-created customers from Supabase when it opens or regains focus.
- Existing manual customer and booking behaviour is unchanged.

## One-time Supabase setup

1. In Supabase, open **SQL Editor** and run `supabase/customers.sql`.
2. In Vercel → your Confirmly project → **Settings → Environment Variables**, add:
   - `SUPABASE_URL` — your project URL, for example `https://xxxxx.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY` — Supabase Settings → API → `service_role` key
3. Redeploy Confirmly after adding both variables.

Do not put the service-role key in browser code. This build keeps it only inside Vercel API routes.

## Test

1. Open **Customers → New customer → Let customer create profile**.
2. Scan the QR code from another device.
3. Submit the form.
4. Return to the dashboard and either focus/reopen the tab or refresh it. The new customer should appear in Customers.

The dashboard remains usable offline, but cross-device QR intake requires Supabase and the Vercel variables above.


## v40 fix
Restores the missing customer choice, QR, and preview modals that caused the **New customer** button to do nothing in v39.


## v41 sync visibility
- Adds a **Sync** button to Customers.
- Shows a clear message when the customer API/database connection fails instead of failing silently.
- Manual sync refreshes the customers table without requiring a full page reload.


## v42 — Automatic customer sync
- Removes the visible Customers “Sync” button.
- QR-created customer profiles now refresh automatically every 8 seconds while the dashboard is open, and immediately when the tab regains focus.


## v43 — Reliable automatic customer refresh
- Polls the shared customer database every 3 seconds while the app is visible.
- Immediately refreshes when Customers opens, the page regains focus, becomes visible, or is restored from browser cache.
- Adds request/response no-cache protections and a new PWA cache version so an older script cannot keep running.


## v44 fix
Fixes a dashboard render crash caused by a missing `bannerCopy` element. The crash prevented the automatic customer-sync timer from ever starting.

## v45 — Supabase-backed core workspace data
Run `supabase/workspace-state.sql` in Supabase SQL Editor. This adds shared cloud persistence for business settings, appointments and manually-created customer records, while keeping a local browser backup and the existing QR customer intake table.

Requires the existing Vercel environment variables:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

After deployment, the first browser that opens an existing workspace migrates its local Confirmly data to Supabase automatically. Subsequent changes sync after a short delay. Authentication/workspace authorization remains the next planned milestone; do not treat shared QR URLs as private credentials.


## v46 — cross-device workspace link
Without account login, each browser otherwise generates a separate private workspace key. In Settings, copy the private Workspace Access link and open it on another device/browser to connect it to the same Supabase-backed workspace. Treat this link like a password.


## v47 workspace persistence fix
- Forces the first migration from local browser data to Supabase after workspace hydration.
- Retries the save automatically until it succeeds.
- API now returns the saved update timestamp for reliable linked-workspace refreshes.


## v48 — first workspace cloud seed
- Ensures the original browser creates its `workspace_state` record immediately, even where its local data looks like defaults.
- Prevents a browser opened from a shared Workspace Access link from overwriting a missing remote workspace with an empty one.
