const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const isEmail = (value = '') => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
const attempts = new Map();
const WINDOW_MS = 60_000;
const MAX_ATTEMPTS_PER_MINUTE = 8;

function clientKey(req) {
  const forwarded = String(req.headers?.['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || 'unknown';
}

function isRateLimited(req) {
  const key = clientKey(req);
  const now = Date.now();
  const recent = (attempts.get(key) || []).filter(timestamp => now - timestamp < WINDOW_MS);
  if (recent.length >= MAX_ATTEMPTS_PER_MINUTE) return true;
  recent.push(now);
  attempts.set(key, recent);
  return false;
}

module.exports = async (req, res) => {
  const configured = Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
  const testMode = Boolean(String(process.env.CONFIRMLY_TEST_RECIPIENT || '').trim());
  const senderUsesResendDev = /@(?:[a-z0-9-]+\.)?resend\.dev>/i.test(String(process.env.RESEND_FROM_EMAIL || ''));

  // Safe status check for the UI. No secret values or recipient addresses are returned.
  if (req.method === 'GET') {
    return res.status(200).json({ configured, testMode, senderUsesResendDev });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  if (!configured) {
    return res.status(503).json({ error: 'Live email is not configured yet. Add RESEND_API_KEY and RESEND_FROM_EMAIL in Vercel, then redeploy.' });
  }

  if (!String(req.headers?.['content-type'] || '').includes('application/json')) {
    return res.status(415).json({ error: 'Expected a JSON request.' });
  }

  if (isRateLimited(req)) {
    return res.status(429).json({ error: 'Too many send attempts. Wait a minute and try again.' });
  }

  let body = {};
  try { body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {}); }
  catch { return res.status(400).json({ error: 'Invalid JSON request.' }); }
  const { to, clientName, service, appointmentDate, appointmentTime, businessName, message } = body;

  if (!isEmail(to)) return res.status(400).json({ error: 'Enter a valid recipient email address.' });
  if (![clientName, service, appointmentDate, appointmentTime, businessName, message].every(value => typeof value === 'string' && value.trim())) {
    return res.status(400).json({ error: 'A booking is missing reminder details.' });
  }

  const allowedRecipient = String(process.env.CONFIRMLY_TEST_RECIPIENT || '').trim().toLowerCase();
  // Test mode intentionally redirects every test booking to the configured owner inbox.
  // This lets the business test the full flow without sending messages to real clients.
  const recipient = allowedRecipient || String(to).trim();

  const from = process.env.RESEND_FROM_EMAIL;
  const subject = `Reminder: your ${service} appointment is on ${appointmentDate} at ${appointmentTime}`;
  const safeBusiness = escapeHtml(businessName);
  const safeClient = escapeHtml(clientName);
  const safeService = escapeHtml(service);
  const safeDate = escapeHtml(appointmentDate);
  const safeTime = escapeHtml(appointmentTime);
  const safeMessage = escapeHtml(message).replace(/\n/g, '<br>');
  const replyTo = String(from).replace(/^.*<|>$/g, '').trim();
  const mailSubjectBase = encodeURIComponent(`${businessName} — ${service} on ${appointmentDate} at ${appointmentTime}`);
  const confirmHref = `mailto:${encodeURIComponent(replyTo)}?subject=${encodeURIComponent('Appointment confirmed — ' + businessName)}&body=${encodeURIComponent(`Hi ${businessName},\n\nI confirm my ${service} appointment on ${appointmentDate} at ${appointmentTime}.\n\nThanks,\n${clientName}`)}`;
  const rescheduleHref = `mailto:${encodeURIComponent(replyTo)}?subject=${encodeURIComponent('Reschedule request — ' + businessName)}&body=${encodeURIComponent(`Hi ${businessName},\n\nI need to reschedule my ${service} appointment on ${appointmentDate} at ${appointmentTime}. Please let me know the next available time.\n\nThanks,\n${clientName}`)}`;

  // Table-based layout + inline styles provide dependable rendering in Gmail, Outlook and mobile clients.
  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#eef3ef;font-family:Arial,Helvetica,sans-serif;color:#173228;">
    <span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">A quick reminder from ${safeBusiness} about your upcoming appointment.</span>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;margin:0;padding:0;background:#eef3ef;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 28px rgba(21,51,40,0.10);">
            <tr>
              <td style="padding:28px 32px 24px;background:#16372b;color:#ffffff;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="vertical-align:middle;">
                      <span style="display:inline-block;width:32px;height:32px;line-height:32px;text-align:center;border-radius:10px;background:#baf7ce;color:#16372b;font-size:20px;font-weight:700;">✓</span>
                      <span style="display:inline-block;margin-left:10px;vertical-align:middle;font-size:20px;line-height:32px;font-weight:700;letter-spacing:-0.4px;">${safeBusiness}</span>
                    </td>
                    <td align="right" style="font-size:12px;font-weight:700;letter-spacing:0.08em;color:#baf7ce;text-transform:uppercase;">Appointment reminder</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:34px 32px 12px;">
                <div style="display:inline-block;background:#e7f8ec;color:#17804c;border-radius:999px;padding:7px 11px;font-size:12px;font-weight:700;letter-spacing:0.02em;">UPCOMING APPOINTMENT</div>
                <h1 style="margin:18px 0 10px;font-size:28px;line-height:1.2;letter-spacing:-0.7px;color:#173228;">Hi ${safeClient},</h1>
                <p style="margin:0;font-size:16px;line-height:1.65;color:#456157;">${safeMessage}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 32px 10px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f4f8f5;border:1px solid #dceae0;border-radius:16px;">
                  <tr>
                    <td style="padding:22px 22px 10px;">
                      <div style="font-size:12px;line-height:1.2;font-weight:700;letter-spacing:0.1em;color:#6b8478;text-transform:uppercase;">Your appointment</div>
                      <div style="margin-top:8px;font-size:22px;line-height:1.25;font-weight:700;color:#173228;">${safeService}</div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:8px 22px 22px;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td style="padding:0 14px 0 0;width:50%;border-right:1px solid #dceae0;vertical-align:top;">
                            <div style="font-size:12px;color:#6b8478;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Date</div>
                            <div style="margin-top:5px;font-size:15px;color:#173228;font-weight:700;">${safeDate}</div>
                          </td>
                          <td style="padding:0 0 0 16px;width:50%;vertical-align:top;">
                            <div style="font-size:12px;color:#6b8478;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Time</div>
                            <div style="margin-top:5px;font-size:15px;color:#173228;font-weight:700;">${safeTime}</div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:22px 32px 12px;">
                <a href="${confirmHref}" style="display:inline-block;background:#168151;color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:14px 22px;border-radius:10px;">✓ Confirm appointment</a>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:3px 32px 32px;">
                <a href="${rescheduleHref}" style="font-size:14px;font-weight:700;color:#285f48;text-decoration:underline;">Need to reschedule?</a>
                <span style="display:inline-block;margin:0 8px;color:#bdd0c4;">•</span>
                <a href="mailto:${encodeURIComponent(replyTo)}?subject=${mailSubjectBase}" style="font-size:14px;font-weight:700;color:#285f48;text-decoration:underline;">Contact ${safeBusiness}</a>
              </td>
            </tr>
            <tr>
              <td style="border-top:1px solid #e4ece6;padding:20px 32px 24px;background:#fbfdfb;">
                <p style="margin:0;text-align:center;font-size:12px;line-height:1.6;color:#71857b;">This reminder was sent by ${safeBusiness} with Confirmly.<br>Reply to this email if you need help with your booking.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to: [recipient], subject, html }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error('Resend error', response.status, data);
      const providerError = data.message || data.error?.message || data.error || data.name || 'Resend could not send this email.';
      return res.status(response.status).json({ error: String(providerError) });
    }
    return res.status(200).json({ ok: true, id: data.id, testMode: Boolean(allowedRecipient) });
  } catch (error) {
    console.error('Email delivery error', error);
    return res.status(500).json({ error: 'Could not reach the email service. Try again.' });
  }
};
