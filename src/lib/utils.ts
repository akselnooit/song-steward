export function keyLabel(key: string, minor: boolean): string {
  return minor ? `${key.toLowerCase()}-moll` : `${key} dur`
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
