import { useState, type FormEvent } from 'react'
import { submitFeedback, type FeedbackKind } from '../lib/feedbackStore'

type Props = {
  open: boolean
  onClose: () => void
}

export function FeedbackPopup({ open, onClose }: Props) {
  const [kind, setKind] = useState<FeedbackKind>('bug')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)

  if (!open) return null

  const handleClose = () => {
    setMessage('')
    setKind('bug')
    setDone(false)
    setSending(false)
    onClose()
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (sending) return
    setSending(true)
    const result = await submitFeedback(kind, message)
    setSending(false)
    if (!result.ok) {
      if (result.reason === 'empty') alert('กรุณาพิมพ์ข้อความ')
      else if (result.reason === 'too_long') alert('ข้อความยาวเกินไป (สูงสุด 2000 ตัวอักษร)')
      else if (result.reason === 'not_configured') alert('ระบบยังไม่พร้อมรับข้อความ')
      else alert('ส่งไม่สำเร็จ ลองใหม่อีกครั้ง')
      return
    }
    setDone(true)
    setMessage('')
  }

  return (
    <>
      <div className="overlay" onClick={handleClose} />
      <div className="popup-wrap">
        <div className="popup">
          <div className="popup__head">
            <div className="popup__label">ช่วยพัฒนา Harn</div>
            <h2 className="popup__title">รายงาน / แนะนำ</h2>
          </div>

          {done ? (
            <div className="feedback-done">
              <p>ขอบคุณสำหรับข้อความ เราได้รับแล้ว</p>
              <button type="button" className="btn btn--primary" onClick={handleClose}>
                ปิด
              </button>
            </div>
          ) : (
            <form className="feedback-form" onSubmit={handleSubmit}>
              <div className="feedback-kinds" role="group" aria-label="ประเภท">
                <button
                  type="button"
                  className={`chip feedback-kind ${kind === 'bug' ? 'feedback-kind--on' : ''}`}
                  onClick={() => setKind('bug')}
                >
                  รายงานปัญหา
                </button>
                <button
                  type="button"
                  className={`chip feedback-kind ${kind === 'idea' ? 'feedback-kind--on' : ''}`}
                  onClick={() => setKind('idea')}
                >
                  แนะนำระบบ
                </button>
              </div>

              <textarea
                className="feedback-textarea"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={
                  kind === 'bug'
                    ? 'อธิบายปัญหาที่เจอ เช่น กดปุ่มแล้วไม่ทำงาน...'
                    : 'อยากให้มีฟีเจอร์อะไรเพิ่ม บอกได้เลย...'
                }
                rows={5}
                maxLength={2000}
                required
              />

              <div className="feedback-meta">{message.trim().length}/2000</div>

              <div className="popup__actions">
                <button type="button" className="btn btn--grey" onClick={handleClose}>
                  ยกเลิก
                </button>
                <button type="submit" className="btn btn--primary" disabled={sending}>
                  {sending ? 'กำลังส่ง...' : 'ส่งข้อความ'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  )
}
