import { useEffect, useState } from 'react'

/**
 * Prostokąt realnie widocznego obszaru — do rozciągnięcia pełnoekranowego
 * edytora dokładnie tam, gdzie kończy się klawiatura.
 *
 * Powłoka aplikacji to `position: fixed`, a iOS przy otwarciu klawiatury NIE
 * zmniejsza layout viewportu — przesuwa i kurczy jedynie viewport wizualny.
 * `visualViewport` jest więc jedynym wiarygodnym źródłem tego, co widać.
 *
 * To jedyne, co bierzemy tu na siebie: wysokość pudełka. Przewijaniem treści
 * i pozycją karetki zajmuje się przeglądarka — od naszych prób robienia tego
 * samodzielnie karetka rozjeżdżała się z tekstem.
 */
export function useVisualViewport(active: boolean) {
  const [box, setBox] = useState<{ top: number; height: number } | null>(null)

  useEffect(() => {
    if (!active) { setBox(null); return }
    const vv = window.visualViewport
    if (!vv) return
    const sync = () => setBox({ top: vv.offsetTop, height: vv.height })
    sync()
    vv.addEventListener('resize', sync)
    vv.addEventListener('scroll', sync)
    // Zapas na sytuacje bez zdarzenia `resize`: klawiatura sprzętowa albo już
    // otwarta w chwili wejścia w edycję.
    const t = window.setTimeout(sync, 350)
    return () => {
      vv.removeEventListener('resize', sync)
      vv.removeEventListener('scroll', sync)
      window.clearTimeout(t)
    }
  }, [active])

  return box
}
