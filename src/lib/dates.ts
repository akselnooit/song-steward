// Jedno miejsce na formatowanie dat i godzin. Wcześniej `todayStr` i
// `formatDatePL` żyły w czterech plikach ekranów — każda kopia z innym
// formatem, więc ta sama data wyglądała inaczej na pulpicie i na liście.

export function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Data z bazy to czysty `DATE` bez strefy. Doklejamy południe, bo o północy
// przesunięcie strefy potrafi cofnąć datę o dzień.
function parse(dateStr: string): Date {
  return new Date(`${dateStr}T12:00:00`)
}

/** „czwartek, 6 sierpnia" — nagłówek karty nabożeństwa na pulpicie. */
export function formatDatePL(dateStr: string): string {
  return parse(dateStr).toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })
}

/** „6 sierpnia 2026" — ekran Live i arkusz pieśni. */
export function formatDateWithYearPL(dateStr: string): string {
  return parse(dateStr).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })
}

/** „czw, 6 sie 2026" — lista „Nabożeństwa". */
export function formatDateCompactPL(dateStr: string): string {
  return parse(dateStr).toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

/** Data dzienna: 27.07, a przy innym roku 27.07.25 — żeby stare wpisy nie kłamały. */
export function shortDatePL(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  const sameYear = y === String(new Date().getFullYear())
  return sameYear ? `${d}.${m}` : `${d}.${m}.${y.slice(2)}`
}

// Ile pełnych dni temu (po dobach lokalnych, nie po 24 h — inaczej strefa czasu
// i zmiana czasu potrafią przesunąć „wczoraj" o dzień).
function daysAgo(dateStr: string): number {
  const d = parse(dateStr)
  const now = new Date()
  const a = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
  const b = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((b - a) / 86400000)
}

/**
 * Etykieta względna dla kafelka „Ostatnio odbyte". Druga linia kafelka zawsze
 * pokazuje konkretną datę, więc tutaj wolno być zgrubnym.
 */
export function relativeDayPL(dateStr: string): string {
  const n = daysAgo(dateStr)
  // n <= 0 nie powinno tu trafić (pasek pokazuje tylko daty wcześniejsze niż
  // dziś), ale gdyby reguła „zakończonego" kiedyś się zmieniła, lepiej żeby
  // dzisiejsze nabożeństwo nie przedstawiało się jako wczorajsze.
  if (n <= 0) return 'dziś'
  if (n === 1) return 'wczoraj'
  if (n <= 6) return parse(dateStr).toLocaleDateString('pl-PL', { weekday: 'long' })
  if (n <= 13) return 'tydzień temu'
  if (n <= 27) return `${Math.floor(n / 7)} tyg. temu`
  // Powyżej roku liczenie miesięcy przestaje cokolwiek mówić („13 mies. temu"),
  // a dokładna data z rokiem i tak jest w linijce niżej.
  if (n >= 365) return 'ponad rok temu'
  const months = Math.floor(n / 30)
  return months <= 1 ? 'miesiąc temu' : `${months} mies. temu`
}

/**
 * „19:00" — bez sekund i bez zera wiodącego w godzinie („9:15", nie „09:15").
 * Postgres zwraca `TIME` jako „19:00:00", ale formularze podają „19:00", więc
 * przyjmujemy oba kształty.
 */
export function formatTimePL(time: string): string {
  const [h, m] = time.split(':')
  return `${Number(h)}:${m}`
}

/** Sortowanie: „9:15" wypada przed „11:00", więc porównujemy wyzerowane godziny. */
export function timeKey(time: string): string {
  const [h, m] = time.split(':')
  return `${h.padStart(2, '0')}:${m}`
}

/**
 * Wspólny porządek nabożeństw: najpierw data, przy remisie godzina. Zwraca
 * wartość dla porządku ROSNĄCEGO (najstarsze pierwsze) — malejący to `-compare`.
 * `created_at` świadomie nie bierze udziału: kolejność dodawania wpisów do apki
 * nie mówi nic o kolejności nabożeństw.
 */
export function compareServices(
  a: { date: string; start_time: string },
  b: { date: string; start_time: string },
): number {
  return a.date.localeCompare(b.date) || timeKey(a.start_time).localeCompare(timeKey(b.start_time))
}
