import { db } from './firebase'
import { ref, onValue, get, set } from 'firebase/database'

const ROOT = 'emailPools'

const localRead = async (key) => {
  try {
    const raw = localStorage.getItem(`correos:${key}`)
    return raw ? JSON.parse(raw) : []
  } catch (e) {
    return []
  }
}

const localWrite = async (key, list) => {
  try {
    localStorage.setItem(`correos:${key}`, JSON.stringify(list))
  } catch (e) {}
}

export const getPool = async (poolName) => {
  try {
    if (!db) throw new Error('no-db')
    const snap = await get(ref(db, `${ROOT}/${poolName}`))
    if (snap && snap.exists()) {
      const val = snap.val()
      if (Array.isArray(val)) return val
      if (typeof val === 'string') return val.split(',').map(s => s.trim()).filter(Boolean)
      return []
    }
    return await localRead(poolName)
  } catch (err) {
    return await localRead(poolName)
  }
}

export const setPool = async (poolName, list) => {
  try {
    if (!db) throw new Error('no-db')
    await set(ref(db, `${ROOT}/${poolName}`), list)
  } catch (err) {
    await localWrite(poolName, list)
  }
}

export const subscribePool = (poolName, cb) => {
  try {
    if (!db) throw new Error('no-db')
    const r = ref(db, `${ROOT}/${poolName}`)
    const off = onValue(r, snap => {
      const val = snap.exists() ? snap.val() : []
      const arr = Array.isArray(val) ? val : (typeof val === 'string' ? val.split(',').map(s => s.trim()).filter(Boolean) : [])
      cb(arr)
    })
    return () => off()
  } catch (err) {
    // fallback: poll localStorage changes (no native event)
    const iv = setInterval(() => cb(JSON.parse(localStorage.getItem(`correos:${poolName}`) || '[]')), 2000)
    return () => clearInterval(iv)
  }
}
