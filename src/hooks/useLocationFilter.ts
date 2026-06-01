import { useState } from 'react'

const KEY = 'ss_location_id'

export function useLocationFilter() {
  const [locationId, setLocationIdState] = useState<string | undefined>(
    () => localStorage.getItem(KEY) ?? undefined
  )

  const setLocationId = (id: string | undefined) => {
    if (id) localStorage.setItem(KEY, id)
    else localStorage.removeItem(KEY)
    setLocationIdState(id)
  }

  return [locationId, setLocationId] as const
}
