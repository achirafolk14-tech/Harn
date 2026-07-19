import { useEffect, useState, type FormEvent } from 'react'
import type { MenuItem, PeopleMap } from '../types'
import { Calculator } from './Calculator'

type Props = {
  open: boolean
  menuName: string
  menu: MenuItem | null
  people: PeopleMap
  onClose: () => void
  onPriceChange: (menuName: string, price: number) => void
  onTogglePerson: (personName: string) => void
  onSelectAll: () => void
  onSetPaidBy: (personName: string) => void
  onAddPerson: (name: string) => boolean
  onRename: (newName: string) => { ok: boolean; reason?: string; name?: string }
  onDelete: () => void
}

export function MenuPopup({
  open,
  menuName,
  menu,
  people,
  onClose,
  onPriceChange,
  onTogglePerson,
  onSelectAll,
  onSetPaidBy,
  onAddPerson,
  onRename,
  onDelete,
}: Props) {
  const [priceText, setPriceText] = useState('0')
  const [calOpen, setCalOpen] = useState(false)
  const [newPerson, setNewPerson] = useState('')
  const [editName, setEditName] = useState(menuName)

  useEffect(() => {
    if (open && menu) {
      setPriceText(String(menu.price || 0))
      setEditName(menuName)
      setCalOpen(true)
    } else {
      setCalOpen(false)
    }
  }, [open, menuName, menu])

  if (!open || !menu) return null

  const submitPerson = (e: FormEvent) => {
    e.preventDefault()
    const name = newPerson.trim()
    if (!name) return
    onAddPerson(name)
    if (!menu.people.includes(name)) {
      onTogglePerson(name)
    }
    setNewPerson('')
  }

  const commitRename = (): string | null => {
    const result = onRename(editName)
    if (!result.ok) {
      if (result.reason === 'exists') alert('รายการนี้มีแล้ว')
      else if (result.reason === 'empty') alert('กรุณาระบุชื่อรายการ')
      setEditName(menuName)
      return null
    }
    const name = result.name ?? menuName
    setEditName(name)
    return name
  }

  const handleSubmitPrice = (value: number) => {
    const name = commitRename() ?? menuName
    onPriceChange(name, value)
    setPriceText(String(value))
  }

  const handleDone = () => {
    const name = commitRename()
    if (!name) return
    const n = Math.ceil(Number(priceText) || 0)
    onPriceChange(name, n)
    setCalOpen(false)
    onClose()
  }

  const handleDelete = () => {
    if (!window.confirm(`ลบรายการ "${menuName}" หรือไม่?`)) return
    onDelete()
    setCalOpen(false)
    onClose()
  }

  const personEntries = Object.entries(people)

  return (
    <>
      <div className="overlay" onClick={handleDone} />
      <div className={`popup-wrap ${calOpen ? 'popup-wrap--with-cal' : ''}`}>
        <div className="popup">
          <div className="popup__head">
            <div className="popup__label">รายการ</div>
            <input
              className="popup__title-input"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  commitRename()
                  ;(e.target as HTMLInputElement).blur()
                }
              }}
              placeholder="ชื่อรายการ"
            />
          </div>

          <input
            className="price-input"
            value={priceText}
            readOnly
            placeholder="ระบุราคา"
            onClick={() => setCalOpen(true)}
          />

          <div className="popup__section">
            <div className="popup__meta">
              💳 คนจ่ายเงิน
              {menu.paidBy ? ` · ${menu.paidBy}` : ' · ยังไม่เลือก'}
            </div>
            <div className="chip-list">
              {personEntries.map(([name, person]) => {
                const selected = menu.paidBy === name
                return (
                  <button
                    key={`payer-${name}`}
                    type="button"
                    className={`chip chip--payer ${selected ? 'chip--payer-on' : ''}`}
                    style={{ ['--hue' as string]: person.hue }}
                    onClick={() => onSetPaidBy(name)}
                  >
                    <span>{selected ? '✓' : '○'}</span> {name}
                  </button>
                )
              })}
              {personEntries.length === 0 && (
                <p className="empty empty--sm">เพิ่มชื่อก่อน แล้วค่อยเลือกคนจ่ายเงิน</p>
              )}
            </div>
          </div>

          <div className="popup__section">
            <div className="popup__meta">
              👥 หารกับ ({menu.people.length} คน คนละ {menu.perPerson} บาท)
            </div>

            <div className="chip-list">
              {personEntries.map(([name, person]) => {
                const selected = menu.people.includes(name)
                return (
                  <button
                    key={name}
                    type="button"
                    className={`chip ${selected ? 'chip--on' : ''}`}
                    style={{ ['--hue' as string]: person.hue }}
                    onClick={() => onTogglePerson(name)}
                  >
                    <span>{selected ? '✓' : '+'}</span> {name}
                  </button>
                )
              })}
            </div>

            <button type="button" className="btn btn--outline" onClick={onSelectAll}>
              + เลือกทุกคน
            </button>
          </div>

          <form className="inline-form" onSubmit={submitPerson}>
            <input
              value={newPerson}
              onChange={(e) => setNewPerson(e.target.value)}
              placeholder="เพิ่มชื่อคน"
            />
            <button type="submit" className="btn btn--grey">
              เพิ่ม
            </button>
          </form>

          <div className="popup__actions">
            <button type="button" className="btn btn--danger" onClick={handleDelete}>
              ลบรายการ
            </button>
            <button type="button" className="btn btn--primary" onClick={handleDone}>
              ตกลง
            </button>
          </div>
        </div>
      </div>

      <Calculator
        open={calOpen}
        value={priceText}
        onChange={setPriceText}
        onSubmit={handleSubmitPrice}
        onClose={() => setCalOpen(false)}
      />
    </>
  )
}
