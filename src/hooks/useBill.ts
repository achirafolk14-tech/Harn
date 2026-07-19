import { useCallback, useEffect, useMemo, useState } from 'react'
import type { BillData, MenusMap, PeopleMap, TabName } from '../types'
import {
  computeSettlement,
  decodeBill,
  encodeBill,
  loadFromStorage,
  nameToHue,
  recomputeAmounts,
  saveToStorage,
  totalPrice,
  withUpdatedPerPerson,
} from '../lib/bill'

function initialBill(): BillData {
  const params = new URLSearchParams(window.location.search)
  // รองรับทั้ง ?b= (สั้น) และ ?bill= (ลิงก์เก่า)
  const billParam = params.get('b') ?? params.get('bill')
  if (billParam) {
    const decoded = decodeBill(billParam)
    if (decoded) return decoded
  }
  return loadFromStorage()
}

export function useBill() {
  const [menus, setMenus] = useState<MenusMap>(() => initialBill().menus)
  const [people, setPeople] = useState<PeopleMap>(() => initialBill().people)
  const [qrId, setQrId] = useState(() => initialBill().qrId)
  const [tab, setTab] = useState<TabName>('menu')

  const persist = useCallback((nextMenus: MenusMap, nextPeople: PeopleMap, nextQr: string) => {
    saveToStorage({ menus: nextMenus, people: nextPeople, qrId: nextQr })
  }, [])

  useEffect(() => {
    persist(menus, people, qrId)
  }, [menus, people, qrId, persist])

  const peopleCount = Object.keys(people).length
  const billTotal = useMemo(() => totalPrice(menus), [menus])
  const settlement = useMemo(() => computeSettlement(menus), [menus])
  const transfers = settlement.transfers

  const shareUrl = useMemo(() => {
    const base = `${window.location.origin}${window.location.pathname}`
    const hasData =
      Object.keys(menus).length > 0 || Object.keys(people).length > 0 || Boolean(qrId)
    if (!hasData) return base
    return `${base}?b=${encodeBill({ menus, people, qrId })}`
  }, [menus, people, qrId])

  const addPerson = useCallback((name: string) => {
    const trimmed = name.trim()
    if (!trimmed || people[trimmed]) return false
    setPeople((prev) => ({
      ...prev,
      [trimmed]: { amount: 0, paid: false, hue: nameToHue(trimmed) },
    }))
    return true
  }, [people])

  const addMenu = useCallback((name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return { ok: false as const, reason: 'empty' as const }
    if (menus[trimmed]) return { ok: false as const, reason: 'exists' as const }
    setMenus((prev) => ({
      ...prev,
      [trimmed]: { price: 0, people: [], perPerson: 0, paidBy: '' },
    }))
    return { ok: true as const, name: trimmed }
  }, [menus])

  const updateMenuPrice = useCallback((menuName: string, price: number) => {
    setMenus((prev) => {
      const current = prev[menuName]
      if (!current) return prev
      const next = withUpdatedPerPerson({
        ...prev,
        [menuName]: { ...current, price: Math.max(0, Math.ceil(price) || 0) },
      })
      setPeople((p) => recomputeAmounts(next, p))
      return next
    })
  }, [])

  const toggleMenuPerson = useCallback((menuName: string, personName: string) => {
    setMenus((prev) => {
      const current = prev[menuName]
      if (!current) return prev
      const has = current.people.includes(personName)
      const list = has
        ? current.people.filter((n) => n !== personName)
        : [...current.people, personName].sort()
      const next = withUpdatedPerPerson({
        ...prev,
        [menuName]: { ...current, people: list },
      })
      setPeople((p) => recomputeAmounts(next, p))
      return next
    })
  }, [])

  const selectAllPeopleForMenu = useCallback((menuName: string) => {
    setMenus((prev) => {
      const current = prev[menuName]
      if (!current) return prev
      const list = Object.keys(people).sort()
      const next = withUpdatedPerPerson({
        ...prev,
        [menuName]: { ...current, people: list },
      })
      setPeople((p) => recomputeAmounts(next, p))
      return next
    })
  }, [people])

  const setMenuPaidBy = useCallback((menuName: string, personName: string) => {
    setMenus((prev) => {
      const current = prev[menuName]
      if (!current) return prev
      const nextPaidBy = current.paidBy === personName ? '' : personName
      return {
        ...prev,
        [menuName]: { ...current, paidBy: nextPaidBy },
      }
    })
  }, [])

  const renameMenu = useCallback((oldName: string, newName: string) => {
    const trimmed = newName.trim()
    if (!trimmed) return { ok: false as const, reason: 'empty' as const }
    if (trimmed === oldName) return { ok: true as const, name: trimmed }
    if (menus[trimmed]) return { ok: false as const, reason: 'exists' as const }
    if (!menus[oldName]) return { ok: false as const, reason: 'missing' as const }

    setMenus((prev) => {
      const current = prev[oldName]
      if (!current) return prev
      const next: MenusMap = {}
      for (const [name, menu] of Object.entries(prev)) {
        if (name === oldName) next[trimmed] = current
        else next[name] = menu
      }
      return next
    })
    return { ok: true as const, name: trimmed }
  }, [menus])

  const deleteMenu = useCallback((menuName: string) => {
    setMenus((prev) => {
      if (!prev[menuName]) return prev
      const next = { ...prev }
      delete next[menuName]
      setPeople((p) => recomputeAmounts(next, p))
      return next
    })
  }, [])

  const renamePerson = useCallback((oldName: string, newName: string) => {
    const trimmed = newName.trim()
    if (!trimmed) return { ok: false as const, reason: 'empty' as const }
    if (trimmed === oldName) return { ok: true as const, name: trimmed }
    if (people[trimmed]) return { ok: false as const, reason: 'exists' as const }
    if (!people[oldName]) return { ok: false as const, reason: 'missing' as const }

    setMenus((prevMenus) => {
      const nextMenus: MenusMap = {}
      for (const [name, menu] of Object.entries(prevMenus)) {
        nextMenus[name] = {
          ...menu,
          paidBy: menu.paidBy === oldName ? trimmed : menu.paidBy,
          people: menu.people.map((p) => (p === oldName ? trimmed : p)).sort(),
        }
      }
      const updatedMenus = withUpdatedPerPerson(nextMenus)

      setPeople((prevPeople) => {
        const current = prevPeople[oldName]
        if (!current) return prevPeople
        const nextPeople: PeopleMap = {}
        for (const [name, person] of Object.entries(prevPeople)) {
          if (name === oldName) {
            nextPeople[trimmed] = { ...current, hue: nameToHue(trimmed) }
          } else {
            nextPeople[name] = person
          }
        }
        return recomputeAmounts(updatedMenus, nextPeople)
      })

      return updatedMenus
    })

    return { ok: true as const, name: trimmed }
  }, [people])

  const deletePerson = useCallback((personName: string) => {
    setMenus((prev) => {
      const next: MenusMap = {}
      for (const [name, menu] of Object.entries(prev)) {
        next[name] = {
          ...menu,
          paidBy: menu.paidBy === personName ? '' : menu.paidBy,
          people: menu.people.filter((p) => p !== personName),
        }
      }
      const updated = withUpdatedPerPerson(next)
      setPeople((p) => {
        if (!p[personName]) return recomputeAmounts(updated, p)
        const nextPeople = { ...p }
        delete nextPeople[personName]
        return recomputeAmounts(updated, nextPeople)
      })
      return updated
    })
  }, [])

  const togglePaid = useCallback((personName: string) => {
    setPeople((prev) => {
      const current = prev[personName]
      if (!current) return prev
      return {
        ...prev,
        [personName]: { ...current, paid: !current.paid },
      }
    })
  }, [])

  const clearMenus = useCallback(() => {
    setMenus({})
    setPeople((prev) => recomputeAmounts({}, prev))
  }, [])

  const clearPeople = useCallback(() => {
    setPeople({})
    setMenus((prev) => {
      const next: MenusMap = {}
      for (const [name, menu] of Object.entries(prev)) {
        next[name] = { ...menu, people: [], perPerson: 0, paidBy: '' }
      }
      return next
    })
  }, [])

  const setPromptPay = useCallback((id: string) => {
    setQrId(id.trim())
  }, [])

  return {
    menus,
    people,
    qrId,
    tab,
    setTab,
    peopleCount,
    billTotal,
    transfers,
    settlement,
    shareUrl,
    addPerson,
    addMenu,
    updateMenuPrice,
    toggleMenuPerson,
    selectAllPeopleForMenu,
    setMenuPaidBy,
    renameMenu,
    deleteMenu,
    renamePerson,
    deletePerson,
    togglePaid,
    clearMenus,
    clearPeople,
    setPromptPay,
  }
}
