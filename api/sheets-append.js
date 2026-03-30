export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const APPS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_URL;

  if (!APPS_SCRIPT_URL) {
    return res.status(500).json({ error: 'GOOGLE_APPS_SCRIPT_URL not configured' });
  }

  try {
    const body =
      typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};

    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      redirect: 'follow',
    });

    const text = await response.text();
    if (!response.ok) {
      return res.status(502).json({ error: `Apps Script error: ${response.status}`, result: text });
    }
    return res.status(200).json({ success: true, result: text });
  } catch (err) {
    return res.status(500).json({ error: err.message || String(err) });
  }
} 