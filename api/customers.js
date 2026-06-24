const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const workspaceKey = String(req.query?.workspace || '').trim();
  if (!workspaceKey) return res.status(400).json({ error: 'Workspace is required.' });
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(503).json({ error: 'Customer sync backend is not configured.' });
  }

  const endpoint = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/customers?workspace_key=eq.${encodeURIComponent(workspaceKey)}&select=id,name,phone,email,preferred_channel,reminder_consent,marketing_consent,whatsapp_opt_in,source,created_at&order=created_at.desc`;
  try {
    const response = await fetch(endpoint, {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    });
    const text = await response.text();
    if (!response.ok) return res.status(response.status).json({ error: 'Could not load customers.', details: text.slice(0, 500) });
    return res.status(200).json({ customers: JSON.parse(text || '[]') });
  } catch {
    return res.status(500).json({ error: 'Customer sync is temporarily unavailable.' });
  }
};
