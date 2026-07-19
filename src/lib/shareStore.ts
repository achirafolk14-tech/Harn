import { encodeBill, decodeBill } from './bill'
import { getSupabase, isSupabaseConfigured, PUBLIC_SHARE_ORIGIN } from './supabase'
import type { BillData } from '../types'

const ID_ALPHABET = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function randomId(length = 7): string {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  let out = ''
  for (let i = 0; i < length; i++) {
    out += ID_ALPHABET[bytes[i]! % ID_ALPHABET.length]
  }
  return out
}

/** สร้างลิงก์สั้นบนโดเมน harn.vercel.app */
export async function createShortShareUrl(data: BillData): Promise<string> {
  const payload = encodeBill(data)
  const longUrl = `${PUBLIC_SHARE_ORIGIN}/?b=${payload}`

  if (!isSupabaseConfigured) return longUrl

  const supabase = getSupabase()
  if (!supabase) return longUrl

  for (let attempt = 0; attempt < 5; attempt++) {
    const id = randomId(7)
    const { error } = await supabase.from('shares').insert({ id, payload })
    if (!error) {
      return `${PUBLIC_SHARE_ORIGIN}/s/${id}`
    }
    // 23505 = unique_violation → สุ่มใหม่
    if (error.code !== '23505') {
      console.warn('createShortShareUrl failed', error.message)
      return longUrl
    }
  }

  return longUrl
}

export async function loadShareById(id: string): Promise<BillData | null> {
  if (!id || !isSupabaseConfigured) return null
  const supabase = getSupabase()
  if (!supabase) return null

  const { data, error } = await supabase
    .from('shares')
    .select('payload')
    .eq('id', id)
    .maybeSingle()

  if (error || !data?.payload) return null
  return decodeBill(data.payload)
}

export function extractShareIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/s\/([a-zA-Z0-9]+)\/?$/)
  return match?.[1] ?? null
}
