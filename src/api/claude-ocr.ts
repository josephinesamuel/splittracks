const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY

const ALL_CATEGORIES = [
  'Accomodation','Equipment','Food','Groceries','Gym',
  'Insurance','Miscelaneous','Shopping','Skincare','Transport','Utilities'
]

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' })
  }

  const { base64Image, mimeType } = req.body

  if (!base64Image || !mimeType) {
    return res.status(400).json({ error: 'Missing base64Image or mimeType' })
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: `You are a bank transaction extractor. Extract ALL transactions from the image.
Return ONLY valid JSON, no markdown, no explanation.
Format: {"transactions": [{"description": string, "amount": number (positive=expense, negative=income/refund), "date": "YYYY-MM-DD", "category": one of ${JSON.stringify(ALL_CATEGORIES)}, "confidence": "high" or "low"}]}
Rules:
- amount is positive for expenses, negative for refunds/income
- Guess the best category from the list based on merchant name
- date: use today if not visible: ${new Date().toISOString().split('T')[0]}
- confidence: "low" if amount or description is unclear`,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: mimeType, data: base64Image },
              },
              { type: 'text', text: 'Extract all transactions from this bank screenshot.' },
            ],
          },
        ],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      return res.status(response.status).json({ error: err })
    }

    const data = await response.json()
    const text = data.content?.find((b: any) => b.type === 'text')?.text || ''

    try {
      const clean = text.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(clean)
      return res.status(200).json(parsed)
    } catch {
      return res.status(500).json({ error: 'Failed to parse Claude response', raw: text })
    }
  } catch (err) {
    return res.status(500).json({ error: String(err) })
  }
}
