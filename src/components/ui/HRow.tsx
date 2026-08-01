import { useEffect, useRef } from 'react'

interface HRowProps {
  /**
   * Aktualnie wybrana wartość. Jej zmiana dosuwa element oznaczony
   * `data-selected="true"` do LEWEJ krawędzi paska.
   */
  selected?: string | null
  className?: string
  style?: React.CSSProperties
  children: React.ReactNode
}

/**
 * Poziomo przewijany pasek chipów wyboru.
 *
 * Na wąskim ekranie wybrana wartość potrafiła zostać poza kadrem po prawej —
 * po wejściu w edycję nie było widać, co właściwie jest zaznaczone. Dlatego po
 * każdej zmianie wyboru (i przy pierwszym wyrenderowaniu, także gdy lista
 * doładuje się później) wybrany chip ląduje przy lewej krawędzi.
 */
export function HRow({ selected, className, style, children }: HRowProps) {
  const ref = useRef<HTMLDivElement>(null)
  // Bez tego dosuwanie powtarzałoby się przy każdym renderze i walczyło
  // z ręcznym przewijaniem użytkownika.
  const alignedFor = useRef<string | null | undefined>(undefined)

  // Celowo bez tablicy zależności: chipy bywają doładowywane asynchronicznie,
  // więc przy pierwszym renderze wybranego elementu może jeszcze nie być w DOM.
  useEffect(() => {
    const row = ref.current
    if (!row) return
    const el = row.querySelector<HTMLElement>('[data-selected="true"]')
    if (!el) return
    if (alignedFor.current === selected) return
    alignedFor.current = selected

    const left = row.scrollLeft + el.getBoundingClientRect().left - row.getBoundingClientRect().left
    if (Math.abs(left - row.scrollLeft) < 2) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    row.scrollTo({ left: Math.max(0, left), behavior: reduce ? 'auto' : 'smooth' })
  })

  return (
    <div ref={ref} className={className ? `hrow ${className}` : 'hrow'} style={style}>
      {children}
    </div>
  )
}
