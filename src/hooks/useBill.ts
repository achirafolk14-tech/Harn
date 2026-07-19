import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { PUBLIC_SHARE_ORIGIN } from '../lib/supabase'
import {
  extractShareIdFromPath,
  loadSavedShareId,
  loadShareById,
  saveShareId,
  shareUrlFromId,
  syncShortShareUrl,
} from '../lib/shareStore'

function initialBillSync(): BillData {
  const params = new URLSearchParams(window.location.search)
  const billParam = params.get('b') ?? params.get('bill')
  if (billParam) {
    const decoded = decodeBill(billParam)
    if (decoded) return decoded
  }
  // ถ้าเปิด /s/xxx จะโหลด async ทีหลัง — เริ่มจากว่างก่อน
  if (extractShareIdFromPath(window.location.pathname)) {
    return { menus: {}, people: {}, qrId: '' }
  }
  return loadFromStorage()
}

function longShareUrl(data: BillData): string {
  const hasData =
    Object.keys(data.menus).length > 0 ||
    Object.keys(data.people).length > 0 ||
    Boolean(data.qrId)
  if (!hasData) return `${PUBLIC_SHARE_ORIGIN}/`
  return `${PUBLIC_SHARE_ORIGIN}/?b=${encodeBill(data)}`
}

export function useBill() {
  const seed = initialBillSync()
  const [menus, setMenus] = useState<MenusMap>(() => seed.menus)
  const [people, setPeople] = useState<PeopleMap>(() => seed.people)
  const [qrId, setQrId] = useState(() => seed.qrId)
  const [tab, setTab] = useState<TabName>('menu')
  const [shareId, setShareId] = useState<string | null>(() => {
    return extractShareIdFromPath(window.location.pathname) || loadSavedShareId()
  })
  const [shortShareUrl, setShortShareUrl] = useState<string | null>(() => {
    const id = extractShareIdFromPath(window.location.pathname) || loadSavedShareId()
    return id ? shareUrlFromId(id) : null
  })
  const [shareLoading, setShareLoading] = useState(false)
  const [bootLoading, setBootLoading] = useState(() =>
    Boolean(extractShareIdFromPath(window.location.pathname)),
  )
  const lastSyncedPayloadRef = useRef<string | null>(null)

  const persist = useCallback((nextMenus: MenusMap, nextPeople: PeopleMap, nextQr: string) => {
    saveToStorage({ menus: nextMenus, people: nextPeople, qrId: nextQr })
  }, [])

  useEffect(() => {
    if (bootLoading) return
    persist(menus, people, qrId)
  }, [menus, people, qrId, persist, bootLoading])

  // โหลดจาก /s/:id (Supabase โปรเจกต์ harn เท่านั้น)
  useEffect(() => {
    const id = extractShareIdFromPath(window.location.pathname)
    if (!id) {
      setBootLoading(false)
      return
    }

    let cancelled = false
    setBootLoading(true)
    loadShareById(id)
      .then((data) => {
        if (cancelled) return
        if (data) {
          saveShareId(id)
          setShareId(id)
          setShortShareUrl(shareUrlFromId(id))
          lastSyncedPayloadRef.current = encodeBill(data)
          setMenus(data.menus)
          setPeople(data.people)
          setQrId(data.qrId)
        }
        setBootLoading(false)
      })
      .catch(() => {
        if (!cancelled) setBootLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const peopleCount = Object.keys(people).length
  const billTotal = useMemo(() => totalPrice(menus), [menus])
  const settlement = useMemo(() => computeSettlement(menus), [menus])
  const transfers = settlement.transfers

  // ลิงก์สั้นเดิมตลอด — แก้บิลแล้วอัปเดตข้อมูลใน id เดิม
  useEffect(() => {
    if (bootLoading) return

    const data = { menus, people, qrId }
    const hasData =
      Object.keys(menus).length > 0 || Object.keys(people).length > 0 || Boolean(qrId)

    if (!hasData) {
      setShareLoading(false)
      // คง shareId ไว้ เผื่อเพิ่มรายการใหม่แล้วยังใช้ลิงก์เดิม
      return
    }

    const payload = encodeBill(data)
    if (lastSyncedPayloadRef.current === payload && shortShareUrl?.includes('/s/')) {
      setShareLoading(false)
      return
    }

    let cancelled = false
    setShareLoading(true)

    const timer = window.setTimeout(() => {
      syncShortShareUrl(data, shareId)
        .then((url) => {
          if (cancelled) return
          if (url.includes('/s/')) {
            const id = url.split('/s/')[1] || shareId
            if (id) {
              setShareId(id)
              saveShareId(id)
            }
            lastSyncedPayloadRef.current = payload
            setShortShareUrl(url)
          } else {
            console.warn('Short link fallback — check UPDATE policy on shares')
          }
          setShareLoading(false)
        })
        .catch(() => {
          if (!cancelled) setShareLoading(false)
        })
    }, 400)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [menus, people, qrId, bootLoading, shareId, shortShareUrl])

  const shareUrl = shortShareUrl ?? longShareUrl({ menus, people, qrId })
  const isShortShare = Boolean(shortShareUrl?.includes('/s/'))

  const ensureShortShareUrl = useCallback(async () => {
    const data = { menus, people, qrId }
    const payload = encodeBill(data)
    if (shortShareUrl?.includes('/s/') && lastSyncedPayloadRef.current === payload) {
      return shortShareUrl
    }
    setShareLoading(true)
    try {
      const url = await syncShortShareUrl(data, shareId)
      if (url.includes('/s/')) {
        const id = url.split('/s/')[1] || shareId
        if (id) {
          setShareId(id)
          saveShareId(id)
        }
        lastSyncedPayloadRef.current = payload
        setShortShareUrl(url)
      }
      return url
    } finally {
      setShareLoading(false)
    }
  }, [shortShareUrl, menus, people, qrId, shareId])

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

  const replaceBill = useCallback((data: BillData) => {
    const nextMenus = withUpdatedPerPerson(data.menus)
    const nextPeople = recomputeAmounts(nextMenus, data.people)
    setMenus(nextMenus)
    setPeople(nextPeople)
    setQrId(data.qrId || '')
  }, [])

  const getBillData = useCallback(
    (): BillData => ({ menus, people, qrId }),
    [menus, people, qrId],
  )

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
    shareLoading,
    bootLoading,
    isShortShare,
    ensureShortShareUrl,
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
    replaceBill,
    getBillData,
  }
}
