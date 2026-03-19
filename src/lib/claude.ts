import { Category, ALL_CATEGORIES } from '../types'
import env from "react-dotenv";

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY || env.VITE_SHEETS_API_KEY

export interface ScannedTransaction {
  description: string
  amount: number
  date: string
  category: Category
  confidence: 'high' | 'low'
}

export async function scanReceiptImage(base64Image: string, mimeType: string): Promise<ScannedTransaction[]> {
  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: `You are a bank transaction extractor. Extract ALL transactions from the image.
Return ONLY valid JSON, no markdown, no explanation.
Format: {"transactions": [{"description": string, "amount": number (positive = expense, negative = income/refund), "date": "YYYY-MM-DD", "category": one of ${JSON.stringify(ALL_CATEGORIES)}, "confidence": "high" or "low"}]}
Rules:
- amount is always positive for expenses, negative for refunds/income
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

  if (!response.ok) throw new Error(`Claude API error: ${response.status}`)
  const data = await response.json()
  const text = data.content?.find((b: { type: string }) => b.type === 'text')?.text || ''

  try {
    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)
    return parsed.transactions || []
  } catch {
    throw new Error('Failed to parse Claude response')
  }
}

export function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const [header, base64] = result.split(',')
      const mimeType = header.match(/data:(.+);base64/)?.[1] || 'image/jpeg'
      resolve({ base64, mimeType })
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
