/**
 * Pomocniki do gestów dotykowych — wspólne dla arkusza (pull-down-to-close)
 * i ekranu nabożeństwa (przesuwanie między nabożeństwami).
 *
 * Oba gesty muszą ustąpić, gdy palec wylądował na czymś, co samo obsługuje
 * przewijanie w poziomie (pasek chipów) albo w polu tekstowym — inaczej
 * przewijanie chipów zamyka arkusz, a przesunięcie w bok podczas pisania
 * przerzuca na inny ekran i gubi niezapisane zmiany.
 */

/** Czy gest zaczął się w polu edycji (input / textarea / contenteditable)? */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  return target.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]') !== null
}

/**
 * Czy gest zaczął się wewnątrz elementu przewijanego w poziomie (i faktycznie
 * mającego co przewijać)? Szukamy w górę drzewa aż do `boundary` (wyłącznie).
 */
export function inHorizontalScroller(target: EventTarget | null, boundary?: Element | null): boolean {
  let el = target instanceof Element ? target : null
  while (el && el !== boundary) {
    if (el.scrollWidth - el.clientWidth > 4) {
      const ox = getComputedStyle(el).overflowX
      if (ox === 'auto' || ox === 'scroll') return true
    }
    el = el.parentElement
  }
  return false
}
