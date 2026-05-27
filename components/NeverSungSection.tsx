'use client'

import { useEffect, useState, useMemo } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { useSongOverlay, type ServiceCtx } from '@/contexts/SongOverlayContext'
import { supabase } from '@/lib/supabase'
import { cacheGet, cacheSet } from '@/lib/cache'
import TagFilter from '@/components/TagFilter'
import FilterModal from '@/components/FilterModal'
import type { Tag, TagCategory } from '@/lib/types'

type SongWithTags = {
  id: string
  title: string
  number: number
  collection?: { short_name: string }
  song_tags?: { tag_id: string; pending_removal?: boolean }[]
}
type SungEntry = {
  song_id: string
  service: { service_type_id: string | null; worship_leader_id: string | null } | null
}
type Leader = { id: string; name: string }
type ServiceType = { id: string; name: string }

const DEFAULT_TAG_NAME = '🎯 Rozpoczęcie'

function FilterPills<T extends { id: string }>({
  title, items, selectedIds, onToggle, label,
}: {
  title: string
  items: T[]
  selectedIds: string[]
  onToggle: (id: string) => void
  label: (item: T) => string
}) {
  if (items.length === 0) return null
  return (
    <div className="mb-4">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{title}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onToggle(item.id)}
            className={`rounded-full px-2 py-1 text-xs font-medium transition-all active:scale-95 ${
              selectedIds.includes(item.id) ? 'bg-blue-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {label(item)}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function NeverSungSection({ nearestServiceCtx }: { nearestServiceCtx?: ServiceCtx | null }) {
  const { openSong } = useSongOverlay()
  const [allSongs, setAllSongs] = useState<SongWithTags[]>([])
  const [allTags, setAllTags] = useState<(Tag & { category?: TagCategory })[]>([])
  const [categories, setCategories] = useState<TagCategory[]>([])
  const [sungEntries, setSungEntries] = useState<SungEntry[]>([])
  const [leaders, setLeaders] = useState<Leader[]>([])
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([])
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [excludedTagIds, setExcludedTagIds] = useState<string[]>([])
  const [selectedLeaderIds, setSelectedLeaderIds] = useState<string[]>([])
  const [selectedTypeIds, setSelectedTypeIds] = useState<string[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const [songsData, tagsData, catsData, sungResult, leadersData, typesData] = await Promise.all([
        cacheGet<SongWithTags[]>('songs_all') ??
          fetch('/api/songs').then((r) => r.json()).then((d) => { cacheSet('songs_all', d); return d }),
        cacheGet<Tag[]>('tags_all') ??
          fetch('/api/tags').then((r) => r.json()).then((d) => { cacheSet('tags_all', d); return d }),
        cacheGet<TagCategory[]>('tag_categories_all') ??
          fetch('/api/tag-categories').then((r) => r.json()).then((d) => { cacheSet('tag_categories_all', d); return d }),
        supabase
          .from('service_songs')
          .select('song_id, service:services(service_type_id, worship_leader_id)')
          .eq('status', 'sung'),
        cacheGet<Leader[]>('worship_leaders') ??
          fetch('/api/worship-leaders').then((r) => r.json()).then((d) => { cacheSet('worship_leaders', d); return d }),
        cacheGet<ServiceType[]>('service_types') ??
          fetch('/api/service-types').then((r) => r.json()).then((d) => { cacheSet('service_types', d); return d }),
      ])

      setAllSongs(songsData)
      setAllTags(tagsData)
      setCategories(catsData)
      setSungEntries((sungResult.data || []) as unknown as SungEntry[])
      setLeaders(leadersData)
      setServiceTypes(typesData)

      const defaultTag = tagsData.find((t: Tag) => t.name === DEFAULT_TAG_NAME)
      if (defaultTag) setSelectedTagIds([defaultTag.id])
      setLoading(false)
    }
    init()
  }, [])

  // Zbiór zaśpiewanych ID z uwzględnieniem filtrów liderów/typów
  const filteredSungIds = useMemo(() => {
    return new Set(
      sungEntries
        .filter((e) => {
          const svc = Array.isArray(e.service) ? e.service[0] : e.service
          if (selectedLeaderIds.length > 0 && !selectedLeaderIds.includes(svc?.worship_leader_id ?? '')) return false
          if (selectedTypeIds.length > 0 && !selectedTypeIds.includes(svc?.service_type_id ?? '')) return false
          return true
        })
        .map((e) => e.song_id)
    )
  }, [sungEntries, selectedLeaderIds, selectedTypeIds])

  const unsungSongs = useMemo(() => {
    return allSongs
      .filter((song) => {
        // Uwzględnij tylko aktywne tagi (bez pending_removal)
        const tagIds = (song.song_tags || [])
          .filter((st) => !st.pending_removal)
          .map((st) => st.tag_id)
        if (selectedTagIds.length > 0 && !selectedTagIds.every((id) => tagIds.includes(id))) return false
        if (excludedTagIds.some((id) => tagIds.includes(id))) return false
        return !filteredSungIds.has(song.id)
      })
      .slice(0, 5)
  }, [allSongs, filteredSungIds, selectedTagIds, excludedTagIds])

  const toggleLeader = (id: string) =>
    setSelectedLeaderIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  const toggleType = (id: string) =>
    setSelectedTypeIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  const hasFilters = selectedTagIds.length > 0 || excludedTagIds.length > 0 || selectedLeaderIds.length > 0 || selectedTypeIds.length > 0

  useEffect(() => {
    document.body.style.overflow = modalOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [modalOpen])

  const filterLabel = useMemo(() => {
    const leaderNames = selectedLeaderIds
      .map((id) => leaders.find((l) => l.id === id)?.name.split(' ')[0])
      .filter(Boolean) as string[]
    const typeNames = selectedTypeIds
      .map((id) => serviceTypes.find((t) => t.id === id)?.name)
      .filter(Boolean) as string[]
    const tagNames = selectedTagIds
      .map((id) => allTags.find((t) => t.id === id)?.name)
      .filter(Boolean) as string[]

    if (!leaderNames.length && !typeNames.length && !tagNames.length) return ''

    let result = 'Niepodawane'
    if (leaderNames.length) result += ` przez ${leaderNames.join(', ')}`
    if (typeNames.length) result += ` na ${typeNames.join(', ')}`
    if (tagNames.length === 1) result += ` · z tagiem ${tagNames[0]}`
    else if (tagNames.length > 1) result += ` · z tagami: ${tagNames.join(', ')}`

    return result
  }, [selectedTagIds, excludedTagIds, selectedLeaderIds, selectedTypeIds, allTags, leaders, serviceTypes])

  if (loading) {
    return <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 h-24 animate-pulse" />
  }

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-semibold text-gray-700">🌱 Jeszcze nie śpiewane</h2>
          <button
            onClick={() => setModalOpen(true)}
            className={`transition-colors p-1 -mr-1 active:scale-95 ${hasFilters ? 'text-blue-900' : 'text-gray-400 hover:text-blue-900'}`}
            title="Zmień filtry"
          >
            <SlidersHorizontal size={16} />
          </button>
        </div>
        {filterLabel && <p className="text-xs text-gray-400 mb-3">{filterLabel}</p>}

        {unsungSongs.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-1">Wszystkie zaśpiewane 🎉</p>
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

      <FilterModal open={modalOpen} onClose={() => setModalOpen(false)}>
        <FilterPills title="Liderzy" items={leaders} selectedIds={selectedLeaderIds} onToggle={toggleLeader} label={(l) => l.name} />
        <FilterPills title="Typy nabożeństw" items={serviceTypes} selectedIds={selectedTypeIds} onToggle={toggleType} label={(t) => t.name} />

        <div className="border-t border-gray-100 pt-4 mt-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Tagi</p>
          <TagFilter
            availableTags={allTags}
            selectedTagIds={selectedTagIds}
            excludedTagIds={excludedTagIds}
            onToggleTag={(id) => {
              setExcludedTagIds((prev) => prev.filter((x) => x !== id))
              setSelectedTagIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
            }}
            onToggleExclude={(id) => {
              setSelectedTagIds((prev) => prev.filter((x) => x !== id))
              setExcludedTagIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
            }}
            onClear={() => { setSelectedTagIds([]); setExcludedTagIds([]) }}
            categories={categories}
          />
        </div>

        {hasFilters && (
          <button
            onClick={() => { setSelectedTagIds([]); setExcludedTagIds([]); setSelectedLeaderIds([]); setSelectedTypeIds([]) }}
            className="text-blue-900 text-sm underline mt-3"
          >
            Wyczyść wszystkie filtry
          </button>
        )}
      </FilterModal>
    </>
  )
}
