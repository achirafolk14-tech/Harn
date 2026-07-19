import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string'
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

/**
 * แพ็คกะทัดรัดสำหรับแชร์ URL
 * [version, peopleNames[], menus[[name, price, paidByIdx|-1, peopleIdx[]]], qrId]
 */
type PackedBill = [1, string[], [string, number, number, number[]][], string]

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

function packBill(data: BillData): PackedBill {
  const names = Object.keys(data.people)
  const indexOf = (name: string) => names.indexOf(name)

  const packedMenus: PackedBill[2] = Object.entries(data.menus).map(([name, menu]) => [
    name,
    menu.price || 0,
    menu.paidBy ? indexOf(menu.paidBy) : -1,
    menu.people.map(indexOf).filter((i) => i >= 0),
  ])

  return [1, names, packedMenus, data.qrId || '']
}

function unpackBill(packed: PackedBill): BillData {
  const [, names, packedMenus, qrId] = packed
  const people: PeopleMap = {}
  for (const name of names) {
    people[name] = { amount: 0, paid: false, hue: nameToHue(name) }
  }

  const menus: MenusMap = {}
  for (const [name, price, paidByIdx, peopleIdx] of packedMenus) {
    const sharePeople = peopleIdx
      .map((i) => names[i])
      .filter((n): n is string => Boolean(n))
    menus[name] = normalizeMenu({
      price,
      people: sharePeople,
      paidBy: paidByIdx >= 0 ? names[paidByIdx] ?? '' : '',
    })
  }

  return {
    menus,
    people: recomputeAmounts(menus, people),
    qrId: qrId || '',
  }
}

function decodeLegacyBill(parsed: unknown): BillData | null {
  if (!Array.isArray(parsed) || parsed.length < 2) return null

  // รูปแบบเก่า: [menus, people, qrId]
  if (
    parsed[0] &&
    typeof parsed[0] === 'object' &&
    !Array.isArray(parsed[0]) &&
    parsed[1] &&
    typeof parsed[1] === 'object' &&
    !Array.isArray(parsed[1])
  ) {
    const menus = withUpdatedPerPerson(parsed[0] as MenusMap)
    const peopleRaw = parsed[1] as PeopleMap
    const people: PeopleMap = {}
    for (const [name, p] of Object.entries(peopleRaw)) {
      people[name] = {
        amount: 0,
        paid: Boolean(p?.paid),
        hue: typeof p?.hue === 'number' ? p.hue : nameToHue(name),
      }
    }
    return {
      menus,
      people: recomputeAmounts(menus, people),
      qrId: typeof parsed[2] === 'string' ? parsed[2] : '',
    }
  }

  // แพ็คใหม่แบบยังไม่บีบอัด
  if (parsed[0] === 1 && Array.isArray(parsed[1]) && Array.isArray(parsed[2])) {
    return unpackBill(parsed as PackedBill)
  }

  return null
}

/** บีบอัดบิลให้สั้นที่สุดสำหรับใส่ใน URL (ไม่ต้อง encodeURIComponent ซ้ำ) */
export function encodeBill(data: BillData): string {
  const json = JSON.stringify(packBill(data))
  return compressToEncodedURIComponent(json)
}

export function decodeBill(raw: string): BillData | null {
  if (!raw) return null

  // ลิงก์ใหม่ (lz-string)
  try {
    const inflated = decompressFromEncodedURIComponent(raw)
    if (inflated) {
      const parsed = JSON.parse(inflated) as unknown
      const packed = decodeLegacyBill(parsed)
      if (packed) return packed
    }
  } catch {
    // fall through
  }

  // ลิงก์เก่า (JSON ตรง ๆ / URI-encoded)
  try {
    let text = raw
    try {
      text = decodeURIComponent(raw)
    } catch {
      /* keep raw */
    }
    return decodeLegacyBill(JSON.parse(text))
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


/** รูปแบบไฟล์ส่งออก (อ่านง่าย / นำเข้ากลับได้) */
export type ExportFile = {
  v: 1
  app: 'harn'
  exportedAt: string
  qrId: string
  people: string[]
  menus: Array<{
    name: string
    price: number
    paidBy: string
    people: string[]
  }>
}

export function toExportFile(data: BillData): ExportFile {
  return {
    v: 1,
    app: 'harn',
    exportedAt: new Date().toISOString(),
    qrId: data.qrId || '',
    people: Object.keys(data.people),
    menus: Object.entries(data.menus).map(([name, menu]) => ({
      name,
      price: menu.price || 0,
      paidBy: menu.paidBy || '',
      people: [...menu.people],
    })),
  }
}

export function exportBillText(data: BillData): string {
  return JSON.stringify(toExportFile(data), null, 2)
}

function fromExportFile(file: ExportFile): BillData | null {
  if (file.v !== 1 || !Array.isArray(file.people) || !Array.isArray(file.menus)) {
    return null
  }

  const people: PeopleMap = {}
  for (const name of file.people) {
    if (typeof name !== 'string' || !name.trim()) continue
    people[name.trim()] = { amount: 0, paid: false, hue: nameToHue(name.trim()) }
  }

  const ensurePerson = (raw: string) => {
    const n = raw.trim()
    if (!n) return ''
    if (!people[n]) {
      people[n] = { amount: 0, paid: false, hue: nameToHue(n) }
    }
    return n
  }

  const menus: MenusMap = {}
  for (const item of file.menus) {
    if (!item || typeof item.name !== 'string' || !item.name.trim()) continue
    const name = item.name.trim()

    for (const p of Array.isArray(item.people) ? item.people : []) {
      if (typeof p === 'string') ensurePerson(p)
    }
    if (typeof item.paidBy === 'string' && item.paidBy.trim()) {
      ensurePerson(item.paidBy)
    }

    const sharePeople = (Array.isArray(item.people) ? item.people : [])
      .map((p) => (typeof p === 'string' ? p.trim() : ''))
      .filter((p) => p && people[p])

    const paidBy =
      typeof item.paidBy === 'string' && people[item.paidBy.trim()]
        ? item.paidBy.trim()
        : ''

    menus[name] = normalizeMenu({
      price: Number(item.price) || 0,
      people: sharePeople,
      paidBy,
    })
  }

  return {
    menus,
    people: recomputeAmounts(menus, people),
    qrId: typeof file.qrId === 'string' ? file.qrId : '',
  }
}

/** นำเข้าจาก JSON ไฟล์ / ข้อความ / ลิงก์แชร์ */
export function parseImportBill(raw: string): BillData | null {
  const text = raw.trim()
  if (!text) return null

  // ลิงก์เต็มที่มี ?b= หรือ ?bill=
  try {
    if (text.includes('?b=') || text.includes('?bill=') || text.startsWith('http')) {
      const url = new URL(text, 'https://local.invalid')
      const param = url.searchParams.get('b') ?? url.searchParams.get('bill')
      if (param) {
        const fromLink = decodeBill(param)
        if (fromLink) return fromLink
      }
    }
  } catch {
    /* not a url */
  }

  // payload บีบอัดจากลิงก์
  const fromEncoded = decodeBill(text)
  if (fromEncoded) return fromEncoded

  try {
    const parsed = JSON.parse(text) as unknown

    // ไฟล์ส่งออกของ Harn
    if (
      parsed &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed) &&
      (parsed as ExportFile).app === 'harn' &&
      (parsed as ExportFile).v === 1
    ) {
      return fromExportFile(parsed as ExportFile)
    }

    // object แบบ { menus, people, qrId }
    if (
      parsed &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed) &&
      'menus' in parsed &&
      'people' in parsed
    ) {
      const obj = parsed as { menus: MenusMap; people: PeopleMap; qrId?: string }
      const menus = withUpdatedPerPerson(obj.menus ?? {})
      const peopleRaw = obj.people ?? {}
      const people: PeopleMap = {}
      for (const [name, p] of Object.entries(peopleRaw)) {
        people[name] = {
          amount: 0,
          paid: Boolean(p?.paid),
          hue: typeof p?.hue === 'number' ? p.hue : nameToHue(name),
        }
      }
      return {
        menus,
        people: recomputeAmounts(menus, people),
        qrId: typeof obj.qrId === 'string' ? obj.qrId : '',
      }
    }

    return decodeLegacyBill(parsed)
  } catch {
    return null
  }
}

export function downloadBillFile(data: BillData, filename?: string) {
  const blob = new Blob([exportBillText(data)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const stamp = new Date().toISOString().slice(0, 10)
  a.href = url
  a.download = filename || `harn-bill-${stamp}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
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
