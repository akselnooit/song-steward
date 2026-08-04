/**
 * Robocza treść notatki trzymana lokalnie, per nabożeństwo.
 *
 * iOS ubija PWA w tle bez ostrzeżenia — bez tego zapasu tekst, którego nie
 * udało się jeszcze wysłać (brak sieci, uśpiona karta), przepadałby wraz
 * z pamięcią zakładki. Klucz zawiera `serviceId`, więc równoległa edycja kilku
 * nabożeństw nie nadpisuje się wzajemnie.
 *
 * Szkic żyje tylko do potwierdzonego zapisu; przy starcie sprzątamy porzucone
 * starsze niż dwa tygodnie, żeby `localStorage` nie zarastał.
 */

const PREFIX = 'ss-notes-draft:'
const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000

type Draft = { v: string; t: number }

export function readDraft(serviceId: string): string | null {
  try {
    const raw = localStorage.getItem(PREFIX + serviceId)
    if (!raw) return null
    const d = JSON.parse(raw) as Draft
    return typeof d?.v === 'string' ? d.v : null
  } catch {
    return null
  }
}

export function writeDraft(serviceId: string, value: string): void {
  try {
    const d: Draft = { v: value, t: Date.now() }
    localStorage.setItem(PREFIX + serviceId, JSON.stringify(d))
  } catch {
    // Tryb prywatny albo wyczerpany limit — szkic jest wygodą, nie warunkiem
    // działania. Zapis do bazy i tak leci swoją drogą.
  }
}

export function clearDraft(serviceId: string): void {
  try {
    localStorage.removeItem(PREFIX + serviceId)
  } catch { /* jak wyżej */ }
}

export function pruneDrafts(): void {
  try {
    const now = Date.now()
    const stale: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key?.startsWith(PREFIX)) continue
      let t = 0
      try { t = (JSON.parse(localStorage.getItem(key) ?? '{}') as Draft).t ?? 0 } catch { t = 0 }
      if (now - t > MAX_AGE_MS) stale.push(key)   // brak/nieczytelny znacznik → do kosza
    }
    stale.forEach(k => localStorage.removeItem(k))
  } catch { /* jak wyżej */ }
}
