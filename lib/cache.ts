// Prosty cache oparty na localStorage z TTL
// Używany do cachowania pieśni i tagów (zmieniają się rzadko)

const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 godziny

interface CacheEntry<T> {
  data: T
  cachedAt: number
}

export function getCached<T>(key: string): T | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const entry: CacheEntry<T> = JSON.parse(raw)
    if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
      localStorage.removeItem(key)
      return null
    }
    return entry.data
  } catch {
    return null
  }
}

export function setCached<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify({ data, cachedAt: Date.now() }))
  } catch {
    // localStorage niedostępny lub pełny — kontynuuj bez cache
  }
}

export function clearCache(...keys: string[]): void {
  if (typeof window === 'undefined') return
  keys.forEach((key) => localStorage.removeItem(key))
}
