const TTL_MS = 10 * 60 * 1000 // 10 minut

interface CacheEntry<T> {
  data: T
  expiresAt: number
}

export function cacheGet<T>(key: string): T | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(`ss_${key}`)
    if (!raw) return null
    const entry: CacheEntry<T> = JSON.parse(raw)
    if (Date.now() > entry.expiresAt) {
      localStorage.removeItem(`ss_${key}`)
      return null
    }
    return entry.data
  } catch {
    return null
  }
}

export function cacheSet<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return
  try {
    const entry: CacheEntry<T> = { data, expiresAt: Date.now() + TTL_MS }
    localStorage.setItem(`ss_${key}`, JSON.stringify(entry))
  } catch {
    // localStorage quota exceeded lub niedostępne
  }
}
