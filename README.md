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
