import { useEffect, useState, type FormEvent } from 'react'
import { useBill } from './hooks/useBill'
import { MENU_SUGGESTIONS } from './lib/bill'
import { shortenUrl } from './lib/shorten'
import { MenuPopup } from './components/MenuPopup'
import { PeoplePopup } from './components/PeoplePopup'
import { SettlePanel } from './components/SettlePanel'
import './App.css'

export default function App() {
  const bill = useBill()
  const [menuInput, setMenuInput] = useState('')
  const [peopleInput, setPeopleInput] = useState('')
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [activePerson, setActivePerson] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [shortUrl, setShortUrl] = useState('')
  const [shortening, setShortening] = useState(false)
  const [shortError, setShortError] = useState(false)

  const displayShareUrl = shortUrl || bill.shareUrl

  useEffect(() => {
    let cancelled = false
    const longUrl = bill.shareUrl

    // ไม่มียอด/รายการ — ใช้ URL หลักสั้นๆ อยู่แล้ว
    if (!longUrl.includes('?')) {
      setShortUrl('')
      setShortError(false)
      setShortening(false)
      return
    }

    setShortening(true)
    setShortError(false)
    setShortUrl('')

    const timer = window.setTimeout(() => {
      shortenUrl(longUrl)
        .then((short) => {
          if (!cancelled) {
            setShortUrl(short)
            setShortening(false)
          }
        })
        .catch(() => {
          if (!cancelled) {
            setShortUrl('')
            setShortError(true)
            setShortening(false)
          }
        })
    }, 400)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [bill.shareUrl])

  const submitMenu = (e: FormEvent) => {
    e.preventDefault()
    const result = bill.addMenu(menuInput)
    if (!result.ok) {
      if (result.reason === 'exists') alert('รายการนี้มีแล้ว')
      return
    }
    setMenuInput('')
    setActiveMenu(result.name)
  }

  const submitPeople = (e: FormEvent) => {
    e.preventDefault()
    if (bill.addPerson(peopleInput)) {
      setPeopleInput('')
    }
  }

  const addPromptPay = () => {
    const value = window.prompt('ระบุเบอร์โทรศัพท์/เลขบัตรประชาชนที่ลงทะเบียน PromptPay')
    if (value === null) return
    bill.setPromptPay(value)
  }

  const copyShareUrl = async () => {
    const text = displayShareUrl
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      const el = document.getElementById('bill_url') as HTMLInputElement | null
      el?.select()
      document.execCommand('copy')
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }

  const clearMenus = () => {
    if (window.confirm('คุณยืนยันการล้างหรือไม่')) bill.clearMenus()
  }

  const clearPeople = () => {
    if (window.confirm('คุณยืนยันการล้างหรือไม่')) bill.clearPeople()
  }

  const qrSrc = bill.qrId
    ? `https://promptpay.io/${encodeURIComponent(bill.qrId)}.png`
    : null

  return (
    <div className="app">
      <main className="card">
        <header className="header">
          <div className="stat">
            <div className="stat__label">จำนวนคน</div>
            <div className="stat__value">{bill.peopleCount}</div>
          </div>
          <div className="stat">
            <div className="stat__label">ราคารวม</div>
            <div className="stat__value">{bill.billTotal}</div>
          </div>
          <button type="button" className="qr-btn" onClick={addPromptPay}>
            <div className="qr-btn__label">
              {bill.qrId || 'Add PromptPay'}
            </div>
            {qrSrc ? (
              <img src={qrSrc} alt="PromptPay QR" className="qr-btn__img" />
            ) : (
              <div className="qr-btn__placeholder" aria-hidden>
                <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <path d="M14 14h3v3h-3zM18 14h3v3h-3zM14 18h3v3h-3zM18 18h3v3" />
                </svg>
              </div>
            )}
          </button>
        </header>

        <nav className="tabs tabs--3">
          <button
            type="button"
            className={`tab ${bill.tab === 'menu' ? 'tab--active' : ''}`}
            onClick={() => bill.setTab('menu')}
          >
            <span>☰</span> รายการ
          </button>
          <button
            type="button"
            className={`tab ${bill.tab === 'people' ? 'tab--active' : ''}`}
            onClick={() => bill.setTab('people')}
          >
            <span>👥</span> คน
          </button>
          <button
            type="button"
            className={`tab ${bill.tab === 'settle' ? 'tab--active' : ''}`}
            onClick={() => bill.setTab('settle')}
          >
            <span>⇄</span> สรุปโอน
          </button>
        </nav>

        {bill.tab === 'menu' && (
          <section className="panel">
            <div className="list-head">
              <span className="col-name">ชื่อรายการ</span>
              <span className="col-price">ราคา</span>
              <span className="col-share">คนละ</span>
            </div>

            <div className="list-body">
              {Object.entries(bill.menus).map(([name, menu]) => (
                <button
                  key={name}
                  type="button"
                  className="list-row list-row--btn"
                  onClick={() => setActiveMenu(name)}
                >
                  <div className="col-name">
                    <div className="item-name">{name}</div>
                    {menu.paidBy && (
                      <div className="item-payer">
                        จ่ายโดย{' '}
                        <span
                          className="tag tag--payer"
                          style={{ ['--hue' as string]: bill.people[menu.paidBy]?.hue ?? 200 }}
                        >
                          {menu.paidBy}
                        </span>
                      </div>
                    )}
                    <div className="item-tags">
                      {menu.people.map((p) => (
                        <span
                          key={p}
                          className="tag"
                          style={{ ['--hue' as string]: bill.people[p]?.hue ?? 200 }}
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                  <span className="col-price">{menu.price}</span>
                  <span className="col-share muted">{menu.perPerson}</span>
                </button>
              ))}
              {Object.keys(bill.menus).length === 0 && (
                <p className="empty">เพิ่มรายการอาหารด้านล่าง</p>
              )}
            </div>

            <form className="inline-form" onSubmit={submitMenu}>
              <input
                value={menuInput}
                onChange={(e) => setMenuInput(e.target.value)}
                placeholder="ระบุรายการ"
                list="menu-suggestions"
                autoComplete="off"
              />
              <datalist id="menu-suggestions">
                {MENU_SUGGESTIONS.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
              <button type="submit" className="btn btn--primary">
                เพิ่ม
              </button>
            </form>

            <button type="button" className="link-danger" onClick={clearMenus}>
              ล้างรายการทั้งหมด
            </button>
          </section>
        )}

        {bill.tab === 'people' && (
          <section className="panel">
            <div className="list-head">
              <span className="col-name">ชื่อคน</span>
              <span className="col-price">ส่วนตัว</span>
              <span className="col-share" />
            </div>

            <div className="list-body">
              {Object.entries(bill.people).map(([name, person]) => (
                <div key={name} className="list-row">
                  <button
                    type="button"
                    className={`person-name ${person.paid ? 'person-name--paid' : ''}`}
                    style={{ ['--hue' as string]: person.hue }}
                    onClick={() => bill.togglePaid(name)}
                  >
                    {name}
                    {person.paid && <span className="tag">โอนแล้ว</span>}
                  </button>
                  <span className="col-price">{person.amount}</span>
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => setActivePerson(name)}
                    aria-label={`ดูรายละเอียด ${name}`}
                  >
                    ☰
                  </button>
                </div>
              ))}
              {Object.keys(bill.people).length === 0 && (
                <p className="empty">เพิ่มชื่อคนด้านล่าง</p>
              )}
            </div>

            <form className="inline-form" onSubmit={submitPeople}>
              <input
                value={peopleInput}
                onChange={(e) => setPeopleInput(e.target.value)}
                placeholder="ระบุชื่อ"
              />
              <button type="submit" className="btn btn--primary">
                เพิ่ม
              </button>
            </form>

            <button type="button" className="link-danger" onClick={clearPeople}>
              ล้างรายชื่อทั้งหมด
            </button>
          </section>
        )}

        {bill.tab === 'settle' && (
          <SettlePanel
            menus={bill.menus}
            people={bill.people}
            settlement={bill.settlement}
          />
        )}

        <section className="share">
          <label htmlFor="bill_url">แชร์บิล</label>
          <div className="share__field">
            <input
              id="bill_url"
              readOnly
              value={
                shortening
                  ? 'กำลังสร้างลิงก์สั้น...'
                  : displayShareUrl
              }
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <button
              type="button"
              className="share__copy"
              onClick={copyShareUrl}
              disabled={shortening}
              title={shortUrl ? 'คัดลอกลิงก์สั้น' : 'คัดลอกลิงก์'}
            >
              {copied ? '✓' : '⎘'}
            </button>
          </div>
          {shortError && (
            <p className="share__hint">ย่อลิงก์ไม่สำเร็จ — ใช้ลิงก์ยาวแทน</p>
          )}
        </section>
      </main>

      <footer className="footer">
        <p>*เศษทศนิยมจะถูกปัดขึ้นโดยอัตโนมัติ</p>
        <p>
          CheckBill <span className="footer__accent">หารค่าอาหาร</span>
        </p>
      </footer>

      <MenuPopup
        open={!!activeMenu}
        menuName={activeMenu ?? ''}
        menu={activeMenu ? bill.menus[activeMenu] : null}
        people={bill.people}
        onClose={() => setActiveMenu(null)}
        onPriceChange={(price) => activeMenu && bill.updateMenuPrice(activeMenu, price)}
        onTogglePerson={(personName) =>
          activeMenu && bill.toggleMenuPerson(activeMenu, personName)
        }
        onSelectAll={() => activeMenu && bill.selectAllPeopleForMenu(activeMenu)}
        onSetPaidBy={(personName) =>
          activeMenu && bill.setMenuPaidBy(activeMenu, personName)
        }
        onAddPerson={bill.addPerson}
      />

      <PeoplePopup
        open={!!activePerson}
        personName={activePerson ?? ''}
        person={activePerson ? bill.people[activePerson] : null}
        menus={bill.menus}
        onClose={() => setActivePerson(null)}
        onToggleMenu={(menuName) =>
          activePerson && bill.toggleMenuPerson(menuName, activePerson)
        }
      />
    </div>
  )
}
