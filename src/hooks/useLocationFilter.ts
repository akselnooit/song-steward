import { useSyncExternalStore } from 'react'

const KEY = 'ss_location_id'

// Globalny filtr lokalizacji jako współdzielony, reaktywny store.
// Wcześniej był to lokalny useState inicjalizowany raz z localStorage — komponenty
// montowane trwale (np. SongOverlay w ProtectedRoute) nie widziały późniejszych zmian
// filtra, przez co historia śpiewania ignorowała wybraną lokalizację. useSyncExternalStore
// sprawia, że WSZYSTKIE instancje aktualizują się natychmiast po zmianie.
const listeners = new Set<() => void>()

function subscribe(cb: () => void) {
  listeners.add(cb)
  const onStorage = (e: StorageEvent) => { if (e.key === KEY) cb() }
  window.addEventListener('storage', onStorage) // synchronizacja między kartami
  return () => { listeners.delete(cb); window.removeEventListener('storage', onStorage) }
}

function getSnapshot(): string | undefined {
  return localStorage.getItem(KEY) ?? undefined
}

export function useLocationFilter() {
  const locationId = useSyncExternalStore(subscribe, getSnapshot)

  const setLocationId = (id: string | undefined) => {
    if (id) localStorage.setItem(KEY, id)
    else localStorage.removeItem(KEY)
    listeners.forEach(l => l()) // powiadom wszystkie instancje w tej karcie
  }

  return [locationId, setLocationId] as const
}
