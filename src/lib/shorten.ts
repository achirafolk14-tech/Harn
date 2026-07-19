const cache = new Map<string, string>()

/** ย่อลิงก์ยาว → ลิงก์สั้น (เช่น https://is.gd/xxxxx) */
export async function shortenUrl(longUrl: string): Promise<string> {
  const cached = cache.get(longUrl)
  if (cached) return cached

  const res = await fetch('/api/shorten', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: longUrl }),
  })

  const data = (await res.json()) as { short?: string; error?: string }
  if (!res.ok || !data.short) {
    throw new Error(data.error || 'shorten failed')
  }

  cache.set(longUrl, data.short)
  return data.short
}
