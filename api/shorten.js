/**
 * Vercel Serverless: สร้างลิงก์สั้นผ่าน is.gd
 * POST { url: string } -> { short: string }
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const url = typeof req.body?.url === 'string' ? req.body.url.trim() : ''
  if (!url) {
    res.status(400).json({ error: 'url required' })
    return
  }

  let parsed
  try {
    parsed = new URL(url)
  } catch {
    res.status(400).json({ error: 'invalid url' })
    return
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    res.status(400).json({ error: 'invalid protocol' })
    return
  }

  try {
    const endpoint = `https://is.gd/create.php?format=json&url=${encodeURIComponent(url)}`
    const response = await fetch(endpoint)
    const data = await response.json()

    if (!data.shorturl) {
      res.status(502).json({ error: data.errormessage || 'shorten failed' })
      return
    }

    res.status(200).json({ short: data.shorturl })
  } catch {
    res.status(502).json({ error: 'shorten failed' })
  }
}
