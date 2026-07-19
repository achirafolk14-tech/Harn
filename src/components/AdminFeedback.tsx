import { useEffect, useState } from 'react'
import {
  listFeedbacks,
  type FeedbackItem,
} from '../lib/feedbackStore'
import './AdminFeedback.css'

type Props = {
  token: string
}

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString('th-TH', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

export function AdminFeedback({ token }: Props) {
  const [items, setItems] = useState<FeedbackItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    setError(null)
    listFeedbacks(token).then((result) => {
      setLoading(false)
      if (!result.ok) {
        if (result.reason === 'unauthorized') setError('ลิงก์แอดมินไม่ถูกต้อง หรือยังไม่ได้รัน migration')
        else if (result.reason === 'not_configured') setError('ยังไม่ได้ตั้งค่า Supabase')
        else setError('โหลดไม่สำเร็จ')
        setItems([])
        return
      }
      setItems(result.items)
    })
  }

  useEffect(() => {
    load()
  }, [token])

  return (
    <div className="admin">
      <main className="admin__card">
        <header className="admin__head">
          <div>
            <p className="admin__eyebrow">Harn Admin</p>
            <h1>รายงานปัญหา / แนะนำ</h1>
          </div>
          <button type="button" className="btn btn--primary" onClick={load} disabled={loading}>
            รีเฟรช
          </button>
        </header>

        {loading && <p className="admin__status">กำลังโหลด...</p>}
        {error && <p className="admin__error">{error}</p>}

        {!loading && !error && items.length === 0 && (
          <p className="admin__status">ยังไม่มีข้อความ</p>
        )}

        <ul className="admin__list">
          {items.map((item) => (
            <li key={item.id} className="admin__item">
              <div className="admin__item-meta">
                <span className={`admin__kind admin__kind--${item.kind}`}>
                  {item.kind === 'bug' ? 'ปัญหา' : 'แนะนำ'}
                </span>
                <time dateTime={item.created_at}>{formatWhen(item.created_at)}</time>
              </div>
              <p className="admin__message">{item.message}</p>
            </li>
          ))}
        </ul>

        <p className="admin__foot">
          <a href="/">← กลับหน้าแรก</a>
        </p>
      </main>
    </div>
  )
}
