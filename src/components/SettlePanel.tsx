import type { MenusMap, PeopleMap, Settlement } from '../types'

type Props = {
  menus: MenusMap
  people: PeopleMap
  settlement: Settlement
}

function PersonName({
  name,
  people,
}: {
  name: string
  people: PeopleMap
}) {
  return (
    <span
      className="transfer-name"
      style={{ ['--hue' as string]: people[name]?.hue ?? 200 }}
    >
      {name}
    </span>
  )
}

export function SettlePanel({ menus, people, settlement }: Props) {
  const { transfers, grossDebts, nettings } = settlement
  const missingPayer = Object.entries(menus).filter(([, m]) => m.price > 0 && !m.paidBy)
  const hasMenus = Object.keys(menus).length > 0

  return (
    <section className="panel">
      <div className="settle-intro">
        <h2 className="settle-title">สรุปการโอนเงิน</h2>
        <p className="settle-desc">
          รวมหนี้ทุกรายการ แล้วหักหนี้ไขว้ให้เหลือยอดโอนน้อยที่สุด
        </p>
      </div>

      {missingPayer.length > 0 && (
        <div className="settle-warn">
          ยังไม่ได้เลือกคนจ่ายเงิน: {missingPayer.map(([n]) => n).join(', ')}
        </div>
      )}

      {!hasMenus && <p className="empty">ยังไม่มีรายการ</p>}

      {hasMenus && transfers.length === 0 && grossDebts.length === 0 && missingPayer.length === 0 && (
        <p className="empty">ไม่มียอดที่ต้องโอน (อาจจ่ายครบเองแล้ว)</p>
      )}

      {/* 1) ยอดก่อนหัก */}
      {grossDebts.length > 0 && (
        <div className="settle-block">
          <h3 className="settle-subtitle">1) ยอดหนี้รวมก่อนหัก</h3>
          <div className="gross-list">
            {grossDebts.map((d) => (
              <div key={`${d.from}-${d.to}`} className="gross-row">
                <span>
                  <PersonName name={d.from} people={people} />
                  <span className="transfer-arrow"> → </span>
                  <PersonName name={d.to} people={people} />
                </span>
                <strong>{d.amount} บาท</strong>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2) หักหนี้ไขว้ */}
      {nettings.length > 0 && (
        <div className="settle-block">
          <h3 className="settle-subtitle">2) หักหนี้ไขว้</h3>
          <div className="netting-list">
            {nettings.map((n) => (
              <div key={`${n.a}-${n.b}`} className="netting-card">
                <div className="netting-card__pair">
                  <PersonName name={n.a} people={people} />
                  <span className="transfer-arrow"> ↔ </span>
                  <PersonName name={n.b} people={people} />
                </div>
                <ul className="netting-card__math">
                  <li>
                    <PersonName name={n.a} people={people} /> ต้องให้{' '}
                    <PersonName name={n.b} people={people} />{' '}
                    <strong>{n.aToB}</strong>
                  </li>
                  <li>
                    <PersonName name={n.b} people={people} /> ต้องให้{' '}
                    <PersonName name={n.a} people={people} />{' '}
                    <strong>{n.bToA}</strong>
                  </li>
                  <li className="netting-card__result">
                    {n.netAmount === 0 ? (
                      <>หักกันหมด — ไม่ต้องโอน</>
                    ) : (
                      <>
                        เหลือ{' '}
                        <PersonName name={n.netFrom} people={people} /> โอนให้{' '}
                        <PersonName name={n.netTo} people={people} />{' '}
                        <strong>
                          {Math.max(n.aToB, n.bToA)} − {Math.min(n.aToB, n.bToA)} ={' '}
                          {n.netAmount}
                        </strong>{' '}
                        บาท
                      </>
                    )}
                  </li>
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3) ยอดสุทธิ */}
      {transfers.length > 0 && (
        <div className="settle-block">
          <h3 className="settle-subtitle">
            {nettings.length > 0 ? '3) ยอดสุทธิที่ต้องโอน' : 'ยอดที่ต้องโอน'}
          </h3>
          <div className="transfer-list">
            {transfers.map((t) => (
              <div key={`${t.from}-${t.to}`} className="transfer-card">
                <div className="transfer-card__people">
                  <PersonName name={t.from} people={people} />
                  <span className="transfer-arrow">โอนให้ →</span>
                  <PersonName name={t.to} people={people} />
                </div>
                <div className="transfer-card__amount">{t.amount} บาท</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {hasMenus && transfers.length === 0 && nettings.some((n) => n.netAmount === 0) && (
        <p className="empty">หนี้ไขว้หักกันหมดแล้ว — ไม่ต้องโอนเพิ่ม</p>
      )}

      {hasMenus && (
        <div className="settle-breakdown">
          <h3 className="settle-subtitle">รายละเอียดตามรายการ</h3>
          {Object.entries(menus).map(([name, menu]) => (
            <div key={name} className="breakdown-row">
              <div className="breakdown-row__top">
                <strong>{name}</strong>
                <span>{menu.price} บาท</span>
              </div>
              <div className="breakdown-row__meta">
                จ่ายโดย:{' '}
                {menu.paidBy ? (
                  <span
                    className="tag"
                    style={{ ['--hue' as string]: people[menu.paidBy]?.hue ?? 200 }}
                  >
                    {menu.paidBy}
                  </span>
                ) : (
                  <span className="muted">ยังไม่เลือก</span>
                )}
              </div>
              {menu.paidBy && menu.people.length > 0 && (
                <ul className="breakdown-owes">
                  {menu.people
                    .filter((p) => p !== menu.paidBy)
                    .map((p) => (
                      <li key={p}>
                        {p} → {menu.paidBy}{' '}
                        <strong>{menu.perPerson}</strong> บาท
                      </li>
                    ))}
                  {menu.people.includes(menu.paidBy) && (
                    <li className="muted">{menu.paidBy} กินด้วย (ไม่ต้องโอนให้ตัวเอง)</li>
                  )}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
