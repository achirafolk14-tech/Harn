import type { MenusMap, Person } from '../types'

type Props = {
  open: boolean
  personName: string
  person: Person | null
  menus: MenusMap
  onClose: () => void
  onToggleMenu: (menuName: string) => void
}

export function PeoplePopup({
  open,
  personName,
  person,
  menus,
  onClose,
  onToggleMenu,
}: Props) {
  if (!open || !person) return null

  return (
    <>
      <div className="overlay" onClick={onClose} />
      <div className="popup-wrap">
        <div className="popup">
          <div className="popup__head">
            <div className="popup__label">ยอดชำระ</div>
            <div className="popup__title">{personName}</div>
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
                  <button
                    type="button"
                    className={`menu-check ${selected ? 'menu-check--on' : ''}`}
                    onClick={() => onToggleMenu(menuName)}
                  >
                    <span>{selected ? '✓' : '+'}</span> {menuName}
                  </button>
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

          <button type="button" className="btn btn--primary" onClick={onClose}>
            ตกลง
          </button>
        </div>
      </div>
    </>
  )
}
