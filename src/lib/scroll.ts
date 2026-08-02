/**
 * Pomocniki do „dowożenia" pola edycji nad klawiaturę ekranową.
 *
 * Powłoka aplikacji to `position: fixed` + własny kontener przewijania (`.screen`),
 * więc iOS przy otwarciu klawiatury NIE zmniejsza layout viewportu — przesuwa
 * jedynie viewport wizualny. Własne „odsłanianie" pola przez przeglądarkę operuje
 * na layout viewporcie i przy wysokim polu wyrównuje jego GÓRNĄ krawędź, przez co
 * kursor (u nas zawsze na końcu tekstu) zostaje pod klawiaturą. Jedynym
 * wiarygodnym źródłem informacji o tym, co realnie widać, jest `visualViewport`.
 */

/** Ile pikseli u dołu ekranu zasłania klawiatura (0, gdy schowana). */
export function keyboardHeight(): number {
  const vv = window.visualViewport
  if (!vv) return 0
  return Math.max(0, Math.round(window.innerHeight - vv.height))
}

/** Dolna krawędź realnie widocznego obszaru, we współrzędnych `getBoundingClientRect`. */
function visibleBottom(): number {
  const vv = window.visualViewport
  return vv ? vv.offsetTop + vv.height : window.innerHeight
}

/**
 * Przewija `container` tak, aby dolna krawędź `el` znalazła się nad klawiaturą.
 * W polu rosnącym z treścią, z kursorem na końcu, dolna krawędź pola JEST
 * miejscem kursora — nie trzeba liczyć współrzędnych karetki.
 *
 * Nie robi nic, gdy dół i tak jest widoczny. Cel liczony jest bezwzględnie
 * (`scrollTop + delta`), więc kolejne wywołania w trakcie płynnej animacji
 * trafiają w to samo miejsce, zamiast sumować się i przestrzeliwać.
 */
export function revealAboveKeyboard(
  el: HTMLElement | null,
  container: HTMLElement | null,
  margin = 24,
): void {
  if (!el || !container) return
  const delta = el.getBoundingClientRect().bottom + margin - visibleBottom()
  if (delta <= 1) return
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  container.scrollTo({ top: container.scrollTop + delta, behavior: reduce ? 'auto' : 'smooth' })
}
