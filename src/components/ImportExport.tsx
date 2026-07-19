import { useRef, useState } from 'react'
import type { BillData } from '../types'
import { downloadBillFile, parseImportBill } from '../lib/bill'

type Props = {
  getBillData: () => BillData
  onImport: (data: BillData) => void
}

export function ImportExport({ getBillData, onImport }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [pasteOpen, setPasteOpen] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [message, setMessage] = useState('')

  const showMsg = (text: string) => {
    setMessage(text)
    window.setTimeout(() => setMessage(''), 2500)
  }

  const handleExport = () => {
    downloadBillFile(getBillData())
    showMsg('ส่งออกไฟล์แล้ว')
  }

  const applyImport = (raw: string) => {
    const data = parseImportBill(raw)
    if (!data) {
      alert('ไฟล์หรือข้อความไม่ถูกต้อง')
      return false
    }
    const count = Object.keys(data.menus).length
    if (
      !window.confirm(
        `นำเข้าบิลนี้จะแทนที่ข้อมูลปัจจุบัน\n(รายการ ${count} รายการ, คน ${Object.keys(data.people).length} คน)\nดำเนินการต่อหรือไม่?`,
      )
    ) {
      return false
    }
    onImport(data)
    showMsg('นำเข้าสำเร็จ')
    return true
  }

  const handleFile = async (file: File | null) => {
    if (!file) return
    try {
      const text = await file.text()
      applyImport(text)
    } catch {
      alert('อ่านไฟล์ไม่สำเร็จ')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handlePasteImport = () => {
    if (applyImport(pasteText)) {
      setPasteText('')
      setPasteOpen(false)
    }
  }

  return (
    <section className="io">
      <div className="io__row">
        <button type="button" className="btn btn--io" onClick={handleExport}>
          ส่งออก
        </button>
        <button
          type="button"
          className="btn btn--io"
          onClick={() => fileRef.current?.click()}
        >
          นำเข้าไฟล์
        </button>
        <button
          type="button"
          className="btn btn--io"
          onClick={() => setPasteOpen((v) => !v)}
        >
          วางข้อความ
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json,text/plain"
        hidden
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
      />

      {pasteOpen && (
        <div className="io__paste">
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="วาง JSON หรือลิงก์แชร์บิลที่นี่"
            rows={4}
          />
          <button type="button" className="btn btn--primary" onClick={handlePasteImport}>
            นำเข้า
          </button>
        </div>
      )}

      {message && <p className="io__msg">{message}</p>}
    </section>
  )
}
