# Confirmly — live email test build

Confirmly is a mobile-first appointment confirmation and no-show prevention app for service businesses.

## What works now

- Appointment and reminder management stored in the device browser
- Live **email** reminders through Resend and a Vercel serverless endpoint
- WhatsApp and SMS are clearly marked as demo-only until their providers are added
- iOS and Android PWA installation support

## Set up one real email test

1. Create a Resend account and create an API key with sending access.
2. In Vercel, open the Confirmly project → **Settings** → **Environment Variables**.
3. Add these values for **Production**, **Preview**, and **Development**:
   - `RESEND_API_KEY` = your Resend API key
   - `RESEND_FROM_EMAIL` = `Confirmly <onboarding@resend.dev>` for a personal test, or a sender address on your verified Resend domain for real recipients.
   - `CONFIRMLY_TEST_RECIPIENT` = your own email address. Keep this while testing so the endpoint cannot send to anyone else.
4. Deploy again from Vercel → **Deployments** → **Redeploy**.
5. In Confirmly, create a booking with your own email as the contact, choose **Email**, then tap **Send Email** in the reminder queue.

## Important security rule

Never put a Resend key in `app.js`, `index.html`, or GitHub. The API key belongs only in Vercel Environment Variables. Before selling this to real businesses, add authentication and a database so every account can only send from its own verified sender.

## Files added for live email

- `api/send-reminder.js` — Vercel serverless endpoint; the key stays server-side
- `.env.example` — names of required variables only, with no secrets
