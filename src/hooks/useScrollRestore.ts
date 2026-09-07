import { useEffect, useLayoutEffect, useRef } from 'react'

/**
 * Pamięć pozycji przewinięcia ekranu, przeżywająca odmontowanie.
 *
 * Ekrany w zakładkach i pod trasami montują się od nowa przy każdym wejściu,
 * więc powrót z nabożeństwa (gestem „wstecz" albo strzałką) stawiał listę
 * z powrotem na górze — przy kilkudziesięciu nabożeństwach oznaczało to
 * przewijanie od zera za każdym razem.
 *
 * Mapa żyje w module, nie w `sessionStorage`: pozycja ma znaczenie tylko
 * w obrębie jednego uruchomienia aplikacji, a zapis do storage przy każdym
 * zdarzeniu `scroll` byłby marnotrawstwem.
 *
 * `ready` to sygnał, że treść jest już wyrenderowana — przywracanie pozycji
 * na pustej liście nic by nie dało, bo kontener nie ma jeszcze wysokości.
 */
const positions = new Map<string, number>()

export function useScrollRestore(
  key: string,
  ref: React.RefObject<HTMLElement | null>,
  ready: boolean,
) {
  const restored = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onScroll = () => {
      // Przed przywróceniem kontener stoi na 0 — zapis w tym oknie skasowałby
      // zapamiętaną pozycję, zanim zdążymy z niej skorzystać.
      if (!restored.current) return
      positions.set(key, el.scrollTop)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [key, ref])

  useLayoutEffect(() => {
    if (restored.current || !ready) return
    const el = ref.current
    if (!el) return
    restored.current = true
    const y = positions.get(key)
    if (y) el.scrollTop = y
  }, [key, ready, ref])
}
