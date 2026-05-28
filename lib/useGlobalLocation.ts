'use client'
import { useState, useEffect } from 'react'

export function useGlobalLocation() {
  const [locationId, setLocationIdState] = useState<string | null>(null)

  useEffect(() => {
    // Read from cookie
    const match = document.cookie.match(/ss_location_id=([^;]+)/)
    setLocationIdState(match ? match[1] : null)
  }, [])

  const setLocationId = (id: string | null) => {
    setLocationIdState(id)
    if (id) {
      document.cookie = `ss_location_id=${id}; path=/; max-age=${60 * 60 * 24 * 365}`
    } else {
      document.cookie = 'ss_location_id=; path=/; max-age=0'
    }
  }

  return { locationId, setLocationId }
}
