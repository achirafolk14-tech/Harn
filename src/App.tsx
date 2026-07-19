import { useState, type FormEvent } from 'react'
import { useBill } from './hooks/useBill'
import { MENU_SUGGESTIONS } from './lib/bill'
import { MenuPopup } from './components/MenuPopup'
import { PeoplePopup } from './components/PeoplePopup'
import { SettlePanel } from './components/SettlePanel'
import { ImportExport } from './components/ImportExport'
import { FeedbackPopup } from './components/FeedbackPopup'
import './App.css'

export default function App() {
  const bill = useBill()
  const viewOnly = bill.isViewOnly
  const [menuInput, setMenuInput] = useState('')
  const [peopleInput, setPeopleInput] = useState('')
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [activePerson, setActivePerson] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)

  const submitMenu = (e: FormEvent) => {
    e.preventDefault()
    if (viewOnly) return
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
    if (viewOnly) return
    if (bill.addPerson(peopleInput)) {
      setPeopleInput('')
    }
  }

  const addPromptPay = () => {
    if (viewOnly) return
    const value = window.prompt('ระบุเบอร์โทรศัพท์/เลขบัตรประชาชนที่ลงทะเบียน PromptPay')
    if (value === null) return
    bill.setPromptPay(value)
  }

  const copyShareUrl = async () => {
    const text = viewOnly
      ? window.location.href
      : await bill.ensureShortShareUrl()
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
    if (viewOnly) return
    if (window.confirm('คุณยืนยันการล้างหรือไม่')) bill.clearMenus()
  }

  const clearPeople = () => {
    if (viewOnly) return
    if (window.confirm('คุณยืนยันการล้างหรือไม่')) bill.clearPeople()
  }

  const qrSrc = bill.qrId
    ? `https://promptpay.io/${encodeURIComponent(bill.qrId)}.png`
    : null

  if (bill.bootLoading) {
    return (
      <div className="app">
        <main className="card">
          <p className="boot-msg">กำลังโหลดบิลที่แชร์...</p>
        </main>
      </div>
    )
  }

  return (
    <div className={`app ${viewOnly ? 'app--view-only' : ''}`}>
      <main className="card">
        {viewOnly && (
          <div className="view-banner" role="status">
            <span>โหมดดูอย่างเดียว — แก้ได้เฉพาะเจ้าของบิล</span>
            <a className="view-banner__cta" href="/">
              สร้างบิลใหม่
            </a>
          </div>
        )}

        <header className="header">
          <div className="stat">
            <div className="stat__label">จำนวนคน</div>
            <div className="stat__value">{bill.peopleCount}</div>
          </div>
          <div className="stat">
            <div className="stat__label">ราคารวม</div>
            <div className="stat__value">{bill.billTotal}</div>
          </div>
          <button
            type="button"
            className={`qr-btn ${viewOnly ? 'qr-btn--static' : ''}`}
            onClick={addPromptPay}
            disabled={viewOnly}
            title={viewOnly ? 'ดูอย่างเดียว' : 'ตั้งค่า PromptPay'}
          >
            <div className="qr-btn__label">
              {bill.qrId || (viewOnly ? 'ไม่มี PromptPay' : 'Add PromptPay')}
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
                <p className="empty">{viewOnly ? 'ยังไม่มีรายการ' : 'เพิ่มรายการอาหารด้านล่าง'}</p>
              )}
            </div>

            {!viewOnly && (
              <>
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
              </>
            )}
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
                  {viewOnly ? (
                    <div
                      className={`person-name person-name--static ${person.paid ? 'person-name--paid' : ''}`}
                      style={{ ['--hue' as string]: person.hue }}
                    >
                      {name}
                      {person.paid && <span className="tag">โอนแล้ว</span>}
                    </div>
                  ) : (
                    <button
                      type="button"
                      className={`person-name ${person.paid ? 'person-name--paid' : ''}`}
                      style={{ ['--hue' as string]: person.hue }}
                      onClick={() => bill.togglePaid(name)}
                    >
                      {name}
                      {person.paid && <span className="tag">โอนแล้ว</span>}
                    </button>
                  )}
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
                <p className="empty">{viewOnly ? 'ยังไม่มีรายชื่อ' : 'เพิ่มชื่อคนด้านล่าง'}</p>
              )}
            </div>

            {!viewOnly && (
              <>
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
              </>
            )}
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
          <label htmlFor="bill_url">{viewOnly ? 'ลิงก์บิลนี้' : 'แชร์บิล'}</label>
          <div className="share__field">
            <input
              id="bill_url"
              readOnly
              value={
                viewOnly
                  ? window.location.href
                  : bill.shareLoading
                    ? 'กำลังสร้างลิงก์สั้น...'
                    : bill.shareUrl
              }
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <button
              type="button"
              className="share__copy"
              onClick={copyShareUrl}
              disabled={!viewOnly && bill.shareLoading}
              title="คัดลอกลิงก์"
            >
              {copied ? '✓' : '⎘'}
            </button>
          </div>
          {!viewOnly && !bill.shareLoading && bill.shareUrl.includes('?b=') && (
            <p className="share__hint">
              ยังเป็นลิงก์ยาว — ตั้งค่า VITE_SUPABASE_URL และ VITE_SUPABASE_ANON_KEY บน Vercel แล้ว Redeploy
            </p>
          )}
          {!viewOnly && !bill.shareLoading && bill.isShortShare && (
            <p className="share__ok">ลิงก์สั้นพร้อมแชร์แล้ว</p>
          )}
        </section>

        {!viewOnly && (
          <ImportExport getBillData={bill.getBillData} onImport={bill.replaceBill} />
        )}
      </main>

      <footer className="footer">
        <p>*เศษทศนิยมจะถูกปัดขึ้นโดยอัตโนมัติ</p>
        <p className="footer__menu">
          <button type="button" className="footer__link" onClick={() => setFeedbackOpen(true)}>
            รายงานปัญหา / แนะนำระบบ
          </button>
        </p>
        <p>
          พัฒนาโดย{' '}
          <a
            className="footer__accent"
            href="https://lin.ee/Wd6wJSo1"
            target="_blank"
            rel="noopener noreferrer"
          >
            APPTOOK
          </a>{' '}
          ขายยูทูปพรีเมี่ยมราคาถูก
        </p>
      </footer>

      <FeedbackPopup open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />

      <MenuPopup
        open={!!activeMenu}
        menuName={activeMenu ?? ''}
        menu={activeMenu ? bill.menus[activeMenu] : null}
        people={bill.people}
        readOnly={viewOnly}
        onClose={() => setActiveMenu(null)}
        onPriceChange={(name, price) => bill.updateMenuPrice(name, price)}
        onTogglePerson={(personName) =>
          activeMenu && bill.toggleMenuPerson(activeMenu, personName)
        }
        onSelectAll={() => activeMenu && bill.selectAllPeopleForMenu(activeMenu)}
        onSetPaidBy={(personName) =>
          activeMenu && bill.setMenuPaidBy(activeMenu, personName)
        }
        onAddPerson={bill.addPerson}
        onRename={(newName) => {
          if (!activeMenu) return { ok: false, reason: 'missing' }
          const result = bill.renameMenu(activeMenu, newName)
          if (result.ok && result.name) setActiveMenu(result.name)
          return result
        }}
        onDelete={() => {
          if (activeMenu) bill.deleteMenu(activeMenu)
          setActiveMenu(null)
        }}
      />

      <PeoplePopup
        open={!!activePerson}
        personName={activePerson ?? ''}
        person={activePerson ? bill.people[activePerson] : null}
        menus={bill.menus}
        readOnly={viewOnly}
        onClose={() => setActivePerson(null)}
        onToggleMenu={(menuName) =>
          activePerson && bill.toggleMenuPerson(menuName, activePerson)
        }
        onRename={(newName) => {
          if (!activePerson) return { ok: false, reason: 'missing' }
          const result = bill.renamePerson(activePerson, newName)
          if (result.ok && result.name) setActivePerson(result.name)
          return result
        }}
        onDelete={() => {
          if (activePerson) bill.deletePerson(activePerson)
          setActivePerson(null)
        }}
      />
    </div>
  )
}
