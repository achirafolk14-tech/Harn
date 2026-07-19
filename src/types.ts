export type Person = {
  amount: number
  paid: boolean
  hue: number
}

export type MenuItem = {
  price: number
  people: string[]
  perPerson: number
  /** ชื่อคนที่จ่ายเงินให้ร้านสำหรับรายการนี้ */
  paidBy: string
}

export type PeopleMap = Record<string, Person>
export type MenusMap = Record<string, MenuItem>

export type BillData = {
  menus: MenusMap
  people: PeopleMap
  qrId: string
}

export type Transfer = {
  from: string
  to: string
  amount: number
}

/** ยอดหนี้รวมก่อนหักไขว้ ระหว่างคู่คน */
export type GrossDebt = {
  from: string
  to: string
  amount: number
}

/** อธิบายการหักหนี้ไขว้ของแต่ละคู่ */
export type NettingPair = {
  a: string
  b: string
  aToB: number
  bToA: number
  /** ยอดสุทธิหลังหัก — 0 ถ้าหักกันหมด */
  netAmount: number
  /** ฝั่งที่ต้องโอนหลังหัก (ว่างถ้า net = 0) */
  netFrom: string
  netTo: string
}

export type Settlement = {
  /** ยอดโอนสุทธิหลังหักหนี้ไขว้ */
  transfers: Transfer[]
  /** ยอดหนี้รวมก่อนหัก (รวมทุกคู่ที่มีหนี้) */
  grossDebts: GrossDebt[]
  /** คู่ที่มีหนี้สองทาง ถูกหักไขว้ */
  nettings: NettingPair[]
}

export type TabName = 'menu' | 'people' | 'settle'
