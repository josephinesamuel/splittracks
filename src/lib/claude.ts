import { Category, ALL_CATEGORIES } from '../types'

export interface ScannedTransaction {
  description: string
  amount: number
  date: string
  category: Category
  confidence: 'high' | 'low'
}

export async function scanReceiptImage(base64Image: string, mimeType: string): Promise<ScannedTransaction[]> {
  // Call via /api/claude-ocr (Vercel serverless function)
  // because browsers block direct calls to api.anthropic.com (CORS)
  const response = await fetch('/api/claude-ocr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base64Image, mimeType }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`OCR error: ${response.status} — ${err}`)
  }

  const data = await response.json()
  return data.transactions || []
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
