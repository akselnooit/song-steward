'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { SlidersHorizontal } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cacheGet, cacheSet } from '@/lib/cache'

type SongRef = { id: string; title: string; number: number; collection?: { short_name: string } }
type Entry = {
  song_id: string
  song: SongRef | SongRef[]
  service: { service_type_id: string | null; worship_leader_id: string | null } | null
}
type Leader = { id: string; name: string }
type ServiceType = { id: string; name: string }

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
            className={`rounded-full px-3 py-2 text-sm font-medium min-h-[44px] transition-all active:scale-95 ${
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

export default function TopSungSection() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [leaders, setLeaders] = useState<Leader[]>([])
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([])
  const [selectedLeaderIds, setSelectedLeaderIds] = useState<string[]>([])
  const [selectedTypeIds, setSelectedTypeIds] = useState<string[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const twelveMonthsAgo = new Date()
    twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1)

    const init = async () => {
      const [ssResult, leadersData, typesData] = await Promise.all([
        supabase
          .from('service_songs')
          .select('song_id, song:songs(id, title, number, collection:collections(short_name)), service:services(service_type_id, worship_leader_id)')
          .eq('status', 'sung')
          .gte('added_at', twelveMonthsAgo.toISOString()),
        cacheGet<Leader[]>('worship_leaders') ??
          fetch('/api/worship-leaders').then((r) => r.json()).then((d) => { cacheSet('worship_leaders', d); return d }),
        cacheGet<ServiceType[]>('service_types') ??
          fetch('/api/service-types').then((r) => r.json()).then((d) => { cacheSet('service_types', d); return d }),
      ])
      setEntries((ssResult.data || []) as unknown as Entry[])
      setLeaders(leadersData)
      setServiceTypes(typesData)
      setLoading(false)
    }
    init()
  }, [])

  const topFive = useMemo(() => {
    const filtered = entries.filter((e) => {
      const svc = Array.isArray(e.service) ? e.service[0] : e.service
      if (selectedLeaderIds.length > 0 && !selectedLeaderIds.includes(svc?.worship_leader_id ?? '')) return false
      if (selectedTypeIds.length > 0 && !selectedTypeIds.includes(svc?.service_type_id ?? '')) return false
      return true
    })
    const counts: Record<string, { count: number; song: SongRef }> = {}
    filtered.forEach((e) => {
      const song = Array.isArray(e.song) ? e.song[0] : e.song
      if (!song) return
      if (!counts[e.song_id]) counts[e.song_id] = { count: 0, song }
      counts[e.song_id].count++
    })
    return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 5)
  }, [entries, selectedLeaderIds, selectedTypeIds])

  const toggleLeader = (id: string) =>
    setSelectedLeaderIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  const toggleType = (id: string) =>
    setSelectedTypeIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  const hasFilters = selectedLeaderIds.length > 0 || selectedTypeIds.length > 0

  const filterLabel = useMemo(() => {
    const parts = [
      ...selectedLeaderIds.map((id) => leaders.find((l) => l.id === id)?.name.split(' ')[0]),
      ...selectedTypeIds.map((id) => serviceTypes.find((t) => t.id === id)?.name),
    ].filter(Boolean)
    return parts.join(' · ')
  }, [selectedLeaderIds, selectedTypeIds, leaders, serviceTypes])

  if (loading) return <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 h-32 animate-pulse mb-4" />

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-semibold text-gray-700">🔥 Najczęściej śpiewane (12 mies.)</h2>
          <button
            onClick={() => setModalOpen(true)}
            className={`transition-colors p-1 -mr-1 active:scale-95 ${hasFilters ? 'text-blue-900' : 'text-gray-400 hover:text-blue-900'}`}
            title="Filtruj"
          >
            <SlidersHorizontal size={16} />
          </button>
        </div>
        {filterLabel && <p className="text-xs text-gray-400 mb-3">{filterLabel}</p>}
        {topFive.length === 0 ? (
          <p className="text-sm text-gray-400">Brak danych</p>
        ) : (
          <ol className="space-y-2">
            {topFive.map((item, i) => (
              <li key={item.song.id} className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-400 w-5 shrink-0">{i + 1}.</span>
                <Link href={`/songs/${item.song.id}`} className="flex-1 text-sm text-gray-900 hover:text-blue-900 line-clamp-1">
                  <span className="font-semibold text-gray-500 mr-1">{item.song.number}</span>
                  {item.song.title}
                </Link>
                <span className="text-xs text-gray-400 shrink-0">{item.count}×</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end" onClick={() => setModalOpen(false)}>
          <div className="w-full bg-white rounded-t-2xl pt-4 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Filtruj</h3>
              <button onClick={() => setModalOpen(false)} className="bg-blue-900 text-white rounded-xl px-4 py-2 text-sm font-medium active:scale-95 transition-all">
                Gotowe
              </button>
            </div>
            <FilterPills title="Liderzy" items={leaders} selectedIds={selectedLeaderIds} onToggle={toggleLeader} label={(l) => l.name} />
            <FilterPills title="Typy nabożeństw" items={serviceTypes} selectedIds={selectedTypeIds} onToggle={toggleType} label={(t) => t.name} />
            {hasFilters && (
              <button onClick={() => { setSelectedLeaderIds([]); setSelectedTypeIds([]) }} className="text-blue-900 text-sm underline mt-1">
                Wyczyść filtry
              </button>
            )}
          </div>
        </div>
      )}
    </>
  )
}
