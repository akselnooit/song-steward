export function keyLabel(key: string, minor: boolean): string {
  return minor ? `${key.toLowerCase()}-moll` : `${key} dur`
}

// Kanoniczna trasa pieśni w SongTreasures to /songs/{KLUCZ_ZBIORU}/{NUMER}
// (np. /songs/DP/1), a NIE /songs/{uuid} — uuid renderuje pustą stronę i apka
// się zamyka. Klucz = collections.short_name (DP/KM/SOS/NKM/NDP), numer =
// songs.number. /songs/* jest w AASA, więc link otwiera natywną apkę na telefonie
// (fallback: przeglądarka).
export function songTreasuresUrl(collectionKey: string, number: number): string {
  return `https://songtreasures.app/songs/${collectionKey}/${number}`
}

// "Jan Paweł Nowak" → "J. P. Nowak"; "Anonim" → "Anonim".
// Skraca wszystkie człony prócz ostatniego (nazwiska) do inicjału z kropką.
export function shortAuthor(author: string): string {
  const parts = author.trim().split(/\s+/).filter(Boolean)
  if (parts.length <= 1) return author.trim()
  const last = parts[parts.length - 1]
  const initials = parts.slice(0, -1).map(p => `${p[0].toUpperCase()}.`)
  return [...initials, last].join(' ')
}

const COLLECTION_CLASSES: Record<string, string> = {
  DP: 'col-dp', KM: 'col-km', NDP: 'col-ndp', NKM: 'col-nkm', SOS: 'col-sos',
}
const FALLBACK_CLASSES = ['col-dp', 'col-km', 'col-ndp', 'col-nkm', 'col-sos']

export function collectionClass(shortName: string): string {
  const key = shortName.toUpperCase()
  if (key in COLLECTION_CLASSES) return COLLECTION_CLASSES[key]
  let h = 0
  for (let i = 0; i < shortName.length; i++) h = (h * 31 + shortName.charCodeAt(i)) >>> 0
  return FALLBACK_CLASSES[h % FALLBACK_CLASSES.length]
}

// Stała kolejność kolekcji dla sortowania (tabela `collections` nie ma pola
// porządkowego). DP pierwsze, KM drugie, potem pozostałe. Nieznane kolekcje na końcu.
const COLLECTION_ORDER = ['DP', 'KM', 'SOS', 'NKM', 'NDP']

export function collectionRank(shortName: string): number {
  const i = COLLECTION_ORDER.indexOf(shortName.toUpperCase())
  return i === -1 ? COLLECTION_ORDER.length : i
}

// Wspólny porządek pieśni wszędzie: numer rosnąco, a przy remisie numeru — wg
// kolejności kolekcji (DP, KM, potem inne). Deterministyczny i spójny.
export function compareSongs(
  a: { number: number; short: string },
  b: { number: number; short: string },
): number {
  return a.number - b.number || collectionRank(a.short) - collectionRank(b.short)
}
