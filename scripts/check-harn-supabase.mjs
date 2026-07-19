/**
 * ตรวจว่าโปรเจกต์ harn เชื่อมได้ + มีตาราง shares
 * อ่านจาก .env.local — ไม่พิมพ์ key ออกมา
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const envText = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
const env = Object.fromEntries(
  envText
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    }),
)

const url = env.VITE_SUPABASE_URL
const key = env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url?.includes('enrrnellsqyipuxxrdxn')) {
  console.error('FAIL: URL ต้องเป็นโปรเจกต์ harn (enrrnellsqyipuxxrdxn)')
  process.exit(1)
}
if (!key) {
  console.error('FAIL: ไม่พบ API key ใน .env.local')
  process.exit(1)
}

console.log('OK: URL เป็นโปรเจกต์ harn')
console.log('OK: มี API key (ความยาว', key.length, ')')

const supabase = createClient(url, key)
const { error } = await supabase.from('shares').select('id').limit(1)

if (error) {
  if (error.code === 'PGRST205' || /could not find the table/i.test(error.message)) {
    console.error('NEED_SQL: ยังไม่มีตาราง shares — รัน SQL ในโปรเจกต์ harn ก่อน')
    process.exit(2)
  }
  console.error('FAIL:', error.code || '', error.message)
  process.exit(1)
}

console.log('OK: ตาราง shares พร้อมใช้งาน')
