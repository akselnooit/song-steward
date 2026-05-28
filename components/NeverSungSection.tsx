'use client'

import { useEffect, useState, useMemo } from 'react'
import { useSongOverlay, type ServiceCtx } from '@/contexts/SongOverlayContext'
import { supabase } from '@/lib/supabase'
import { cacheGet, cacheSet } from '@/lib/cache'
import { useNeverSungFilters } from '@/lib/useFilters'
import { useGlobalLocation } from '@/lib/useGlobalLocation'
import type { Tag, TagCategory, WorshipLeader } from '@/lib/types'

type SongWithTags = {
  id: string
  title: string
  number: number
  collection?: { short_name: string }
  song_tags?: { tag_id: string; pending_removal?: boolean }[]
}
type SungEntry = {
  song_id: string
  service: {
    location_id: string | null
    category_id: string | null
    worship_leader_id: string | null
  } | null
}

export default function NeverSungSection({ nearestServiceCtx }: { nearestServiceCtx?: ServiceCtx | null }) {
  const { openSong } = useSongOverlay()
  const { filters } = useNeverSungFilters()
  const { locationId } = useGlobalLocation()
  const [allSongs, setAllSongs] = useState<SongWithTags[]>([])
  const [sungEntries, setSungEntries] = useState<SungEntry[]>([])
  const [leaders, setLeaders] = useState<WorshipLeader[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const [songsData, sungResult, leadersData] = await Promise.all([
        cacheGet<SongWithTags[]>('songs_all') ??
          fetch('/api/songs').then((r) => r.json()).then((d) => { cacheSet('songs_all', d); return d }),
        supabase
          .from('service_songs')
          .select('song_id, service:services(location_id, category_id, worship_leader_id)')
          .eq('status', 'sung'),
        cacheGet<WorshipLeader[]>('worship_leaders') ??
          fetch('/api/worship-leaders').then((r) => r.json()).then((d) => { cacheSet('worship_leaders', d); return d }),
      ])

      setAllSongs(songsData)
      setSungEntries((sungResult.data || []) as unknown as SungEntry[])
      setLeaders(leadersData)
      setLoading(false)
    }
    init()
  }, [])

  // Zbiór zaśpiewanych ID z uwzględnieniem filtrów liderów/kategorii/lokalizacji
  const filteredSungIds = useMemo(() => {
    return new Set(
      sungEntries
        .filter((e) => {
          const svc = Array.isArray(e.service) ? e.service[0] : e.service
          if (locationId && svc?.location_id !== locationId) return false
          if (filters.leaderIds.length > 0 && !filters.leaderIds.includes(svc?.worship_leader_id ?? '')) return false
          if (filters.categoryIds.length > 0 && !filters.categoryIds.includes(svc?.category_id ?? '')) return false
          return true
        })
        .map((e) => e.song_id)
    )
  }, [sungEntries, locationId, filters.leaderIds, filters.categoryIds])

  const unsungSongs = useMemo(() => {
    return allSongs
      .filter((song) => {
        const tagIds = (song.song_tags || [])
          .filter((st) => !st.pending_removal)
          .map((st) => st.tag_id)
        if (filters.includedTagIds.length > 0 && !filters.includedTagIds.every((id) => tagIds.includes(id))) return false
        if (filters.excludedTagIds.some((id) => tagIds.includes(id))) return false
        return !filteredSungIds.has(song.id)
      })
      .slice(0, 5)
  }, [allSongs, filteredSungIds, filters.includedTagIds, filters.excludedTagIds])

  const subtitle = useMemo(() => {
    const parts: string[] = []

    if (locationId) {
      parts.push('Wybrana lokalizacja')
    }

    const leaderNames = filters.leaderIds
      .map((id) => leaders.find((l) => l.id === id)?.name.split(' ')[0])
      .filter(Boolean) as string[]
    if (leaderNames.length > 0) parts.push(leaderNames.join(', '))

    if (filters.includedTagIds.length > 0) parts.push(`${filters.includedTagIds.length} tag(i)`)

    if (parts.length === 0) return 'Wszystkie nabożeństwa'
    return parts.join(' · ')
  }, [locationId, filters.leaderIds, filters.includedTagIds, leaders])

  if (loading) {
    return <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 h-24 animate-pulse" />
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-semibold text-gray-700">Jeszcze nie śpiewane</h2>
      </div>
      <p className="text-xs text-gray-400 mb-3">{subtitle}</p>

      {unsungSongs.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-1">Wszystkie zaśpiewane</p>
      ) : (
        <ol className="space-y-2">
          {unsungSongs.map((song, i) => (
            <li key={song.id} className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-400 w-5 shrink-0">{i + 1}.</span>
              <button
                className="flex-1 text-sm text-gray-900 hover:text-blue-900 line-clamp-1 text-left"
                onClick={() => openSong(song.id, unsungSongs.map((s) => s.id), nearestServiceCtx ?? null)}
              >
                <span className="font-semibold text-gray-500 mr-1">{song.number}</span>
                {song.title}
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
