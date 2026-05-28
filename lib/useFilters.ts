'use client'
import { useState, useEffect } from 'react'

// Types
export type TimeRange = 'all' | '1m' | '3m' | '6m' | '12m'

export interface TopSungFilters {
  leaderIds: string[]
  categoryIds: string[]
  tagIds: string[]
  timeRange: TimeRange
}

export interface NeverSungFilters {
  leaderIds: string[]
  categoryIds: string[]
  includedTagIds: string[]
  excludedTagIds: string[]
}

const KEYS = {
  topSung: 'ss_top_sung_filters',
  neverSung: 'ss_never_sung_filters',
}

const defaults = {
  topSung: { leaderIds: [], categoryIds: [], tagIds: [], timeRange: 'all' as TimeRange },
  neverSung: { leaderIds: [], categoryIds: [], includedTagIds: [], excludedTagIds: [] },
}

function useLocalStorage<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(defaultValue)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(key)
      if (stored) setValue(JSON.parse(stored))
    } catch {}
  }, [key])

  const set = (v: T) => {
    setValue(v)
    try { localStorage.setItem(key, JSON.stringify(v)) } catch {}
  }

  return [value, set] as const
}

export function useTopSungFilters() {
  const [filters, setFilters] = useLocalStorage<TopSungFilters>(KEYS.topSung, defaults.topSung)
  return { filters, setFilters }
}

export function useNeverSungFilters() {
  const [filters, setFilters] = useLocalStorage<NeverSungFilters>(KEYS.neverSung, defaults.neverSung)
  return { filters, setFilters }
}
