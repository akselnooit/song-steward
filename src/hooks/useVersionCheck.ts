import { useEffect, useState } from 'react'

// Lekkie wykrywanie nowej wersji BEZ service workera.
// Porównuje __BUILD_ID__ wkompilowany w działający bundle z buildId w
// ${base}version.json (świeżo pobranym, z pominięciem cache). Sprawdza przy
// starcie i za każdym razem, gdy użytkownik wraca do appki (visibilitychange/focus).
// Nie przeładowuje samo — tylko sygnalizuje; reload następuje na tap w banerze.
export function useVersionCheck(): boolean {
  const [updateAvailable, setUpdateAvailable] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function check() {
      if (cancelled || updateAvailable) return
      try {
        const url = `${import.meta.env.BASE_URL}version.json?t=${Date.now()}`
        const res = await fetch(url, { cache: 'no-store' })
        if (!res.ok) return
        const data = (await res.json()) as { buildId?: string }
        if (!cancelled && data.buildId && data.buildId !== __BUILD_ID__) {
          setUpdateAvailable(true)
        }
      } catch {
        // offline albo brak pliku (np. dev server) — cicho ignoruj
      }
    }

    check() // przy starcie

    const onVisible = () => { if (document.visibilityState === 'visible') check() }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', check)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', check)
    }
    // updateAvailable w deps: po wykryciu przestajemy odpytywać (check() zwraca wcześnie)
  }, [updateAvailable])

  return updateAvailable
}
