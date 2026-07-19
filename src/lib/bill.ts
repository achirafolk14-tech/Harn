import type {
  BillData,
  GrossDebt,
  MenusMap,
  MenuItem,
  NettingPair,
  PeopleMap,
  Settlement,
  Transfer,
} from '../types'

export function nameToHue(name: string): number {
  let hue = 0
  for (let i = 0; i < name.length; i++) {
    hue += name.charCodeAt(i) * 38
  }
  return hue % 360
}

export function calcPerPerson(price: number, count: number): number {
  if (count <= 0 || !Number.isFinite(price)) return 0
  return Math.ceil(price / count)
}

export function normalizeMenu(menu: Partial<MenuItem> | undefined): MenuItem {
  const people = Array.isArray(menu?.people) ? menu.people : []
  const price = Number(menu?.price) || 0
  return {
    price,
    people,
    perPerson: calcPerPerson(price, people.length),
    paidBy: typeof menu?.paidBy === 'string' ? menu.paidBy : '',
  }
}

export function recomputeAmounts(menus: MenusMap, people: PeopleMap): PeopleMap {
  const next: PeopleMap = {}
  for (const name of Object.keys(people)) {
    next[name] = { ...people[name], amount: 0 }
  }

  for (const menu of Object.values(menus)) {
    const per = calcPerPerson(menu.price, menu.people.length)
    for (const personName of menu.people) {
      if (next[personName]) {
        next[personName].amount += per
      }
    }
  }

  return next
}

export function withUpdatedPerPerson(menus: MenusMap): MenusMap {
  const next: MenusMap = {}
  for (const [name, menu] of Object.entries(menus)) {
    next[name] = normalizeMenu(menu)
  }
  return next
}

/** สรุปยอดโอน + อธิบายหนี้ไขว้ */
export function computeSettlement(menus: MenusMap): Settlement {
  const debt: Record<string, Record<string, number>> = {}

  const addDebt = (from: string, to: string, amount: number) => {
    if (!from || !to || from === to || amount <= 0) return
    if (!debt[from]) debt[from] = {}
    debt[from][to] = (debt[from][to] || 0) + amount
  }

  for (const menu of Object.values(menus)) {
    const payer = menu.paidBy
    if (!payer || menu.people.length === 0) continue
    const per = calcPerPerson(menu.price, menu.people.length)
    for (const person of menu.people) {
      if (person !== payer) {
        addDebt(person, payer, per)
      }
    }
  }

  const names = new Set<string>()
  for (const from of Object.keys(debt)) {
    names.add(from)
    for (const to of Object.keys(debt[from])) names.add(to)
  }

  const sorted = [...names].sort()
  const grossDebts: GrossDebt[] = []
  const nettings: NettingPair[] = []
  const transfers: Transfer[] = []

  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const a = sorted[i]
      const b = sorted[j]
      const aToB = debt[a]?.[b] || 0
      const bToA = debt[b]?.[a] || 0

      if (aToB > 0) grossDebts.push({ from: a, to: b, amount: aToB })
      if (bToA > 0) grossDebts.push({ from: b, to: a, amount: bToA })

      if (aToB > 0 && bToA > 0) {
        const net = aToB - bToA
        nettings.push({
          a,
          b,
          aToB,
          bToA,
          netAmount: Math.abs(net),
          netFrom: net > 0 ? a : net < 0 ? b : '',
          netTo: net > 0 ? b : net < 0 ? a : '',
        })
      }

      const net = aToB - bToA
      if (net > 0) transfers.push({ from: a, to: b, amount: net })
      else if (net < 0) transfers.push({ from: b, to: a, amount: -net })
    }
  }

  grossDebts.sort((x, y) => y.amount - x.amount || x.from.localeCompare(y.from))
  transfers.sort((x, y) => y.amount - x.amount || x.from.localeCompare(y.from))

  return { transfers, grossDebts, nettings }
}

/** @deprecated ใช้ computeSettlement().transfers แทน */
export function computeTransfers(menus: MenusMap): Transfer[] {
  return computeSettlement(menus).transfers
}

export function totalPrice(menus: MenusMap): number {
  return Object.values(menus).reduce((sum, m) => sum + (m.price || 0), 0)
}

export function encodeBill(data: BillData): string {
  return encodeURIComponent(JSON.stringify([data.menus, data.people, data.qrId]))
}

export function decodeBill(raw: string): BillData | null {
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length < 2) return null
    return {
      menus: withUpdatedPerPerson(parsed[0] ?? {}),
      people: parsed[1] ?? {},
      qrId: parsed[2] ?? '',
    }
  } catch {
    return null
  }
}

export function loadFromStorage(): BillData {
  try {
    const menusRaw = localStorage.getItem('bill_menus')
    const peopleRaw = localStorage.getItem('bill_peoples')
    const qrRaw = localStorage.getItem('bill_qr')
    return {
      menus: withUpdatedPerPerson(menusRaw ? JSON.parse(menusRaw) : {}),
      people: peopleRaw ? JSON.parse(peopleRaw) : {},
      qrId: qrRaw && qrRaw !== 'undefined' ? qrRaw : '',
    }
  } catch {
    return { menus: {}, people: {}, qrId: '' }
  }
}

export function saveToStorage(data: BillData) {
  localStorage.setItem('bill_menus', JSON.stringify(data.menus))
  localStorage.setItem('bill_peoples', JSON.stringify(data.people))
  localStorage.setItem('bill_qr', data.qrId)
}

export const MENU_SUGGESTIONS = [
  'อาหาร',
  'น้ำอัดลม',
  'น้ำเปล่า',
  'น้ำแข็ง',
  'เบียร์ (โปร)',
  'เหล้า (โปร)',
  'เบียร์',
  'เหล้า',
  'เหล้าปั่น',
  'มิกเซอร์',
]
