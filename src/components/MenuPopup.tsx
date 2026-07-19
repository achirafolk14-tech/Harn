import { useEffect, useState, type FormEvent } from 'react'
import type { MenuItem, PeopleMap } from '../types'
import { Calculator } from './Calculator'

type Props = {
  open: boolean
  menuName: string
  menu: MenuItem | null
  people: PeopleMap
  onClose: () => void
  onPriceChange: (price: number) => void
  onTogglePerson: (personName: string) => void
  onSelectAll: () => void
  onSetPaidBy: (personName: string) => void
  onAddPerson: (name: string) => boolean
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
}: Props) {
  const [priceText, setPriceText] = useState('0')
  const [calOpen, setCalOpen] = useState(false)
  const [newPerson, setNewPerson] = useState('')

  useEffect(() => {
    if (open && menu) {
      setPriceText(String(menu.price || 0))
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

  const handleSubmitPrice = (value: number) => {
    onPriceChange(value)
    setPriceText(String(value))
  }

  const handleDone = () => {
    const n = Math.ceil(Number(priceText) || 0)
    onPriceChange(n)
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
            <div className="popup__title">{menuName}</div>
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

          <button type="button" className="btn btn--primary" onClick={handleDone}>
            ตกลง
          </button>
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
