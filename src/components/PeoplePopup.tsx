import { useEffect, useState } from 'react'
import type { MenusMap, Person } from '../types'

type Props = {
  open: boolean
  personName: string
  person: Person | null
  menus: MenusMap
  readOnly?: boolean
  onClose: () => void
  onToggleMenu: (menuName: string) => void
  onRename: (newName: string) => { ok: boolean; reason?: string; name?: string }
  onDelete: () => void
}

export function PeoplePopup({
  open,
  personName,
  person,
  menus,
  readOnly = false,
  onClose,
  onToggleMenu,
  onRename,
  onDelete,
}: Props) {
  const [editName, setEditName] = useState(personName)

  useEffect(() => {
    if (open) setEditName(personName)
  }, [open, personName])

  if (!open || !person) return null

  const commitRename = () => {
    if (readOnly) return true
    const result = onRename(editName)
    if (!result.ok) {
      if (result.reason === 'exists') alert('ชื่อนี้มีแล้ว')
      else if (result.reason === 'empty') alert('กรุณาระบุชื่อ')
      setEditName(personName)
      return false
    }
    if (result.name) setEditName(result.name)
    return true
  }

  const handleDone = () => {
    if (!commitRename()) return
    onClose()
  }

  const handleDelete = () => {
    if (readOnly) return
    if (!window.confirm(`ลบชื่อ "${personName}" หรือไม่?`)) return
    onDelete()
    onClose()
  }

  return (
    <>
      <div className="overlay" onClick={handleDone} />
      <div className="popup-wrap">
        <div className="popup">
          <div className="popup__head">
            <div className="popup__label">ยอดชำระ</div>
            {readOnly ? (
              <h2 className="popup__title">{personName}</h2>
            ) : (
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
                placeholder="ชื่อคน"
              />
            )}
          </div>

          <div className="list-head">
            <span className="col-name">ชื่อรายการ</span>
            <span className="col-price">ราคา</span>
            <span className="col-share">จ่าย</span>
          </div>

          <div className="list-body">
            {Object.entries(menus).map(([menuName, menu]) => {
              const selected = menu.people.includes(personName)
              const share = selected ? menu.perPerson : 0
              return (
                <div key={menuName} className="list-row">
                  {readOnly ? (
                    <div
                      className={`menu-check menu-check--static ${selected ? 'menu-check--on' : ''}`}
                    >
                      <span>{selected ? '✓' : '·'}</span> {menuName}
                    </div>
                  ) : (
                    <button
                      type="button"
                      className={`menu-check ${selected ? 'menu-check--on' : ''}`}
                      onClick={() => onToggleMenu(menuName)}
                    >
                      <span>{selected ? '✓' : '+'}</span> {menuName}
                    </button>
                  )}
                  <span className="col-price muted">{menu.price}</span>
                  <span className="col-share" style={{ opacity: selected ? 1 : 0.35 }}>
                    {share}
                  </span>
                </div>
              )
            })}
            {Object.keys(menus).length === 0 && (
              <p className="empty">ยังไม่มีรายการ</p>
            )}
          </div>

          <div className="total-row">
            <span>ยอดรวม</span>
            <strong>{person.amount}</strong>
          </div>

          <div className="popup__actions">
            {!readOnly && (
              <button type="button" className="btn btn--danger" onClick={handleDelete}>
                ลบชื่อ
              </button>
            )}
            <button type="button" className="btn btn--primary" onClick={handleDone}>
              {readOnly ? 'ปิด' : 'ตกลง'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
