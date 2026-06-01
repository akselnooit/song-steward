export function keyLabel(key: string, minor: boolean): string {
  return minor ? `${key.toLowerCase()}-moll` : `${key} dur`
}
