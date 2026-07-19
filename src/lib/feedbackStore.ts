import { getSupabase, isSupabaseConfigured } from './supabase'

export type FeedbackKind = 'bug' | 'idea'

export type FeedbackItem = {
  id: string
  kind: FeedbackKind
  message: string
  created_at: string
}

export async function submitFeedback(
  kind: FeedbackKind,
  message: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const trimmed = message.trim()
  if (!trimmed) return { ok: false, reason: 'empty' }
  if (trimmed.length > 2000) return { ok: false, reason: 'too_long' }
  if (!isSupabaseConfigured) return { ok: false, reason: 'not_configured' }

  const supabase = getSupabase()
  if (!supabase) return { ok: false, reason: 'not_configured' }

  const { error } = await supabase.rpc('submit_feedback', {
    p_kind: kind,
    p_message: trimmed,
  })

  if (error) {
    console.warn('submitFeedback failed', error.message)
    return { ok: false, reason: 'error' }
  }
  return { ok: true }
}

export async function listFeedbacks(
  token: string,
): Promise<{ ok: true; items: FeedbackItem[] } | { ok: false; reason: string }> {
  if (!token) return { ok: false, reason: 'unauthorized' }
  if (!isSupabaseConfigured) return { ok: false, reason: 'not_configured' }

  const supabase = getSupabase()
  if (!supabase) return { ok: false, reason: 'not_configured' }

  const { data, error } = await supabase.rpc('list_feedbacks', {
    p_token: token,
  })

  if (error) {
    console.warn('listFeedbacks failed', error.message)
    if (/unauthorized/i.test(error.message)) {
      return { ok: false, reason: 'unauthorized' }
    }
    return { ok: false, reason: 'error' }
  }

  const items = (data ?? []).map((row: FeedbackItem) => ({
    id: row.id,
    kind: row.kind,
    message: row.message,
    created_at: row.created_at,
  }))

  return { ok: true, items }
}
