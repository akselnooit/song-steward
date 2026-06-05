export function keyLabel(key: string, minor: boolean): string {
  return minor ? `${key.toLowerCase()}-moll` : `${key} dur`
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
