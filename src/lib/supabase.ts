import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/** โปรเจกต์ Harn เท่านั้น — https://enrrnellsqyipuxxrdxn.supabase.co */
const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim()
const key = (
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ||
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ||
  ''
).trim()

export const isSupabaseConfigured = Boolean(url && key)

let client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null
  if (!client) {
    client = createClient(url!, key)
  }
  return client
}

export const PUBLIC_SHARE_ORIGIN = (
  (import.meta.env.VITE_PUBLIC_SHARE_ORIGIN as string | undefined) ||
  'https://harn.vercel.app'
).replace(/\/$/, '')
