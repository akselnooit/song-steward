import { useEffect, useState } from 'react'
import { keyboardHeight } from '../lib/scroll'

/**
 * Wysokość klawiatury ekranowej — do zrobienia zapasu na dole kontenera
 * przewijania. Bez zapasu `scrollTop` jest przycinany do końca zawartości
 * i pole edycji nie ma dokąd „wyjechać" nad klawiaturę.
 *
 * Śledzimy dalej także po `active = false`: zapas znika dopiero, gdy klawiatura
 * faktycznie się schowa, żeby zwinięcie paddingu nie szarpnęło ekranem
 * w trakcie jej animacji.
 */
export function useKeyboardInset(active: boolean): number {
  const [inset, setInset] = useState(0)

  useEffect(() => {
    if (!active && inset === 0) return
    const vv = window.visualViewport
    const sync = () => setInset(keyboardHeight())
    sync()
    vv?.addEventListener('resize', sync)
    // Zapas na sytuacje bez zdarzenia `resize`: klawiatura sprzętowa albo
    // klawiatura już otwarta w chwili wejścia w pole.
    const t = window.setTimeout(sync, 350)
    return () => {
      vv?.removeEventListener('resize', sync)
      window.clearTimeout(t)
    }
  }, [active, inset])

  return inset
}
