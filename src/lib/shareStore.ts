import { encodeBill, decodeBill } from './bill'
import { getSupabase, isSupabaseConfigured, PUBLIC_SHARE_ORIGIN } from './supabase'
import type { BillData } from '../types'

const ID_ALPHABET = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const SHARE_ID_KEY = 'bill_share_id'

function randomId(length = 8): string {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  let out = ''
  for (let i = 0; i < length; i++) {
    out += ID_ALPHABET[bytes[i]! % ID_ALPHABET.length]
  }
  return out
}

export function shareUrlFromId(id: string): string {
  return `${PUBLIC_SHARE_ORIGIN}/s/${id}`
}

export function loadSavedShareId(): string | null {
  try {
    const id = localStorage.getItem(SHARE_ID_KEY)
    return id && /^[a-zA-Z0-9]{4,16}$/.test(id) ? id : null
  } catch {
    return null
  }
}

export function saveShareId(id: string) {
  localStorage.setItem(SHARE_ID_KEY, id)
}

export function clearSavedShareId() {
  localStorage.removeItem(SHARE_ID_KEY)
}

async function upsertShare(id: string, payload: string): Promise<boolean> {
  const supabase = getSupabase()
  if (!supabase) return false

  const { error } = await supabase.from('shares').upsert(
    { id, payload },
    { onConflict: 'id' },
  )

  if (!error) return true

  // fallback: update อย่างเดียว ถ้ามีแถวอยู่แล้ว
  const { error: updateError } = await supabase
    .from('shares')
    .update({ payload })
    .eq('id', id)

  if (!updateError) return true

  console.warn('upsertShare failed', error.message, updateError?.message)
  return false
}

/**
 * ได้ลิงก์สั้นเดิมตลอด — ถ้ามี id แล้วจะอัปเดตข้อมูลใน id นั้น
 * สร้างใหม่เฉพาะครั้งแรกที่ยังไม่มีลิงก์
 */
export async function syncShortShareUrl(
  data: BillData,
  preferredId?: string | null,
): Promise<string> {
  const payload = encodeBill(data)
  const longUrl = `${PUBLIC_SHARE_ORIGIN}/?b=${payload}`

  if (!isSupabaseConfigured) return longUrl

  const supabase = getSupabase()
  if (!supabase) return longUrl

  const existingId = preferredId || loadSavedShareId()

  if (existingId) {
    const ok = await upsertShare(existingId, payload)
    if (ok) {
      saveShareId(existingId)
      return shareUrlFromId(existingId)
    }
    // ถ้าอัปเดตไม่ได้ ลองสร้างแถวใหม่ด้วย id เดิม
    const { error: insertError } = await supabase
      .from('shares')
      .insert({ id: existingId, payload })
    if (!insertError) {
      saveShareId(existingId)
      return shareUrlFromId(existingId)
    }
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    const id = randomId(8)
    const { error } = await supabase.from('shares').insert({ id, payload })
    if (!error) {
      saveShareId(id)
      return shareUrlFromId(id)
    }
    if (error.code !== '23505') {
      console.warn('createShortShareUrl failed', error.code, error.message)
      return longUrl
    }
  }

  return longUrl
}

/** @deprecated ใช้ syncShortShareUrl */
export async function createShortShareUrl(data: BillData): Promise<string> {
  return syncShortShareUrl(data)
}

export async function loadShareById(id: string): Promise<BillData | null> {
  if (!id || !isSupabaseConfigured) return null
  const supabase = getSupabase()
  if (!supabase) return null

  // ดึงใหม่ทุกครั้ง ไม่ใช้ของเก่าในแคช
  const { data, error } = await supabase
    .from('shares')
    .select('payload')
    .eq('id', id)
    .maybeSingle()

  if (error || !data?.payload) return null
  return decodeBill(data.payload as string)
}

export function extractShareIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/s\/([a-zA-Z0-9]+)\/?$/)
  return match?.[1] ?? null
}
