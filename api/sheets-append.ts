const APPS_SCRIPT_URL = import.meta.env.GOOGLE_APPS_SCRIPT_URL

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!APPS_SCRIPT_URL) {
    return res.status(500).json({ error: 'GOOGLE_APPS_SCRIPT_URL not configured' })
  }

  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    })

    const text = await response.text()
    if (!response.ok) {
      return res.status(response.status).json({ error: text })
    }

    return res.status(200).json({ success: true })
  } catch (err) {
    return res.status(500).json({ error: String(err) })
  }
}
