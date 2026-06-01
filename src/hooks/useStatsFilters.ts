import { useState } from 'react'
import type { StatsFilters } from '../lib/types'

const KEY = 'ss_stats_filters'

function load(): Omit<StatsFilters, 'locationId'> {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function useStatsFilters() {
  const [prefs, setPrefsState] = useState(load)

  const setPrefs = (p: Omit<StatsFilters, 'locationId'>) => {
    localStorage.setItem(KEY, JSON.stringify(p))
    setPrefsState(p)
  }

  return [prefs, setPrefs] as const
}
