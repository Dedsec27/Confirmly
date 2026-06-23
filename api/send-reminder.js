const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const isEmail = (value = '') => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  if (!process.env.RESEND_API_KEY) {
    return res.status(503).json({ error: 'Live email is not configured yet. Add RESEND_API_KEY in Vercel, then redeploy.' });
  }

  const { to, clientName, service, appointmentDate, appointmentTime, businessName, message } = req.body || {};
  if (!isEmail(to)) return res.status(400).json({ error: 'Enter a valid recipient email address.' });
  if (![clientName, service, appointmentDate, appointmentTime, businessName, message].every(value => typeof value === 'string' && value.trim())) {
    return res.status(400).json({ error: 'A booking is missing reminder details.' });
  }

  const allowedRecipient = String(process.env.CONFIRMLY_TEST_RECIPIENT || '').trim().toLowerCase();
  if (allowedRecipient && String(to).trim().toLowerCase() !== allowedRecipient) {
    return res.status(403).json({ error: 'Test mode is on: reminders can only be sent to the email in CONFIRMLY_TEST_RECIPIENT.' });
  }

  const from = process.env.RESEND_FROM_EMAIL || 'Confirmly <onboarding@resend.dev>';
  const subject = `${businessName}: appointment reminder for ${appointmentDate} at ${appointmentTime}`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1e2b23;line-height:1.55">
      <h2 style="margin:0 0 16px">Appointment reminder</h2>
      <p>${escapeHtml(message)}</p>
      <div style="margin:22px 0;padding:16px;border-radius:12px;background:#f3f8f4">
        <strong>${escapeHtml(service)}</strong><br>
        ${escapeHtml(appointmentDate)} at ${escapeHtml(appointmentTime)}
      </div>
      <p style="font-size:13px;color:#607066">Sent by ${escapeHtml(businessName)} with Confirmly.</p>
    </div>`;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to: [String(to).trim()], subject, html }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error('Resend error', response.status, data);
      return res.status(response.status).json({ error: data.message || 'Resend could not send this email.' });
    }
    return res.status(200).json({ ok: true, id: data.id });
  } catch (error) {
    console.error('Email delivery error', error);
    return res.status(500).json({ error: 'Could not reach the email service. Try again.' });
  }
};
