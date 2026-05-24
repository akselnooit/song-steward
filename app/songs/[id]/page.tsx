'use client'

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { Tag, TagCategory, TagSource } from '@/lib/types'
import Link from 'next/link'
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import { fetcher } from '@/lib/fetcher'
import { usePullToRefresh } from '@/lib/usePullToRefresh'

interface SongDetail {
  id: string
  number: number
  title: string
  author: string | null
  author_image: string | null
  author_id: string | null
  original_key: string | null
  minor: boolean | null
  collection?: { id: string; name: string; short_name: string }
  song_tags: { source: TagSource; pending_removal: boolean; tag: Tag & { category?: TagCategory } }[]
  history: {
    id: string
    added_at: string
    service: { id: string; date: string; service_type?: { name: string }; worship_leader?: { name: string } }
  }[]
}

export default function SongDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [savingTag, setSavingTag] = useState(false)
  const [lightbox, setLightbox] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  // Kontekst nawigacji (strzałki między pieśniami)
  const [navCtx, setNavCtx] = useState<{ songIds: string[]; pos: number } | null>(null)

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('song_nav_context')
      if (!stored) { setNavCtx(null); return }
      const { songIds } = JSON.parse(stored) as { songIds: string[] }
      const pos = songIds.indexOf(id)
      if (pos === -1) { setNavCtx(null); return }
      setNavCtx({ songIds, pos })
    } catch {
      setNavCtx(null)
    }
  }, [id])

  const navigateTo = (targetId: string) => {
    router.replace(`/songs/${targetId}`)
  }

  const handlePrev = () => {
    if (!navCtx) return
    const prevId = navCtx.songIds[(navCtx.pos - 1 + navCtx.songIds.length) % navCtx.songIds.length]
    navigateTo(prevId)
  }

  const handleNext = () => {
    if (!navCtx) return
    const nextId = navCtx.songIds[(navCtx.pos + 1) % navCtx.songIds.length]
    navigateTo(nextId)
  }

  const { data: song, mutate: mutateSong } = useSWR<SongDetail>(`/api/songs/${id}`, fetcher, {
    revalidateOnFocus: false,
  })

  const { refreshing } = usePullToRefresh(mutateSong)
  const { data: allTags = [] } = useSWR<(Tag & { category?: TagCategory })[]>('/api/tags', fetcher, {
    revalidateOnFocus: false,
  })

  if (!song) return <div className="text-center py-20 text-gray-400">Ładowanie...</div>

  // Aktywne tagi (nie oczekują na usunięcie)
  const activeSongTags = song.song_tags.filter((st) => !st.pending_removal)
  const activeTagIds = activeSongTags.map((st) => st.tag.id)
  // Tagi oczekujące na zatwierdzenie usunięcia
  const pendingRemovalTags = song.song_tags.filter((st) => st.pending_removal)
  const pendingRemovalTagIds = pendingRemovalTags.map((st) => st.tag.id)
  // Tagi dodane przez użytkownika — oczekują na zatwierdzenie dodania
  const pendingAdditionTags = activeSongTags.filter((st) => st.source === 'user')

  // Kliknięcie tagu — toggle z obsługą stanów pending
  const toggleTag = async (tagId: string) => {
    setSavingTag(true)
    const existing = song.song_tags.find((st) => st.tag.id === tagId)

    if (existing?.pending_removal) {
      // Tag czeka na usunięcie — kliknięcie przywraca
      await fetch('/api/song-tags', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ song_id: id, tag_id: tagId, action: 'restore' }),
      })
    } else if (existing) {
      // Aktywny tag — oznacz do usunięcia
      await fetch('/api/song-tags', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ song_id: id, tag_id: tagId }),
      })
    } else {
      // Brak tagu — dodaj jako user
      await fetch('/api/song-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ song_id: id, tag_id: tagId }),
      })
    }

    await mutateSong()
    setSavingTag(false)
  }

  const cancelPendingAdd = async (tagId: string) => {
    setSavingTag(true)
    await fetch('/api/song-tags', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ song_id: id, tag_id: tagId, action: 'cancel_add' }),
    })
    await mutateSong()
    setSavingTag(false)
  }

  const toggleCategory = (catId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(catId)) next.delete(catId)
      else next.add(catId)
      return next
    })
  }

  const categories = Array.from(
    new Map(
      allTags
        .filter((t) => t.category)
        .map((t) => [t.category!.id, t.category!])
    ).values()
  )
  const uncategorized = allTags.filter((t) => !t.category_id)

  const tagSourceClass = (source: TagSource | undefined) => {
    if (source === 'user') return 'bg-amber-100 text-amber-700 border border-amber-300'
    if (source === 'ai')   return 'bg-purple-100 text-purple-700 border border-purple-200'
    return 'bg-blue-900 text-white'
  }

  const tagSourceMap = new Map(song.song_tags.map((st) => [st.tag.id, st.source]))

  const collectionLabel = song.collection
    ? `${song.collection.short_name} ${song.number}`
    : `#${song.number}`

  const renderTagCategory = (catId: string, catName: string, tags: (Tag & { category?: TagCategory })[]) => {
    const isOpen = expandedCategories.has(catId)
    const activeTags = tags.filter((t) => activeTagIds.includes(t.id))
    const inactiveTags = tags.filter((t) => !activeTagIds.includes(t.id)).sort((a, b) => a.name.localeCompare(b.name, 'pl'))
    const sortedTags = [...activeTags, ...inactiveTags]

    return (
      <div key={catId} className="border border-gray-100 rounded-xl overflow-hidden">
        <button
          onClick={() => toggleCategory(catId)}
          className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{catName}</span>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <div className={`grid transition-all duration-200 ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
          <div className="overflow-hidden">
            <div className="px-3 py-2.5 flex flex-wrap gap-2 bg-white">
              {sortedTags.map((tag) => {
                const active = activeTagIds.includes(tag.id)
                const pendingRemoval = pendingRemovalTagIds.includes(tag.id)
                const source = tagSourceMap.get(tag.id)
                return (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.id)}
                    disabled={savingTag}
                    className={`rounded-full px-3 py-2 text-sm font-medium min-h-[44px] transition-all active:scale-95 disabled:opacity-50 ${
                      active
                        ? tagSourceClass(source)
                        : pendingRemoval
                          ? 'bg-gray-100 text-gray-400 line-through'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {tag.name}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 pt-6 pb-4 max-w-lg mx-auto">
      {refreshing && (
        <div className="flex items-center justify-center gap-2 text-xs text-blue-600 mb-2 -mt-2">
          <Loader2 size={12} className="animate-spin" /> Odświeżanie...
        </div>
      )}
      {/* Nawigacja: wróć + pozycja + strzałki */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => router.back()} className="text-sm text-blue-900">← Wróć</button>
        {navCtx && (
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-400 mr-1">{navCtx.pos + 1}/{navCtx.songIds.length}</span>
            <button
              onClick={handlePrev}
              className="p-1.5 rounded-lg text-blue-900 hover:bg-blue-50 active:scale-95 transition-all"
              title="Poprzednia"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 rounded-lg text-blue-900 hover:bg-blue-50 active:scale-95 transition-all"
              title="Następna"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
        <div className="flex items-start gap-3">
          <span className="bg-blue-900 text-white rounded-lg px-2.5 py-1 text-sm font-bold shrink-0">
            {collectionLabel}
          </span>
          <div>
            <h1 className="text-lg font-bold text-gray-900">{song.title}</h1>
            {song.author && (
              <div className="flex items-center gap-1.5 mt-0.5">
                {song.author_image && (
                  <button onClick={() => setLightbox(true)} className="shrink-0 focus:outline-none" aria-label="Pokaż zdjęcie autora">
                    <img src={song.author_image} alt={song.author} className="w-5 h-5 rounded-full object-cover hover:opacity-80 transition-opacity" />
                  </button>
                )}
                <Link
                  href={`/songs?author_id=${song.author_id}&author_name=${encodeURIComponent(song.author)}`}
                  className="text-sm text-gray-500 hover:text-blue-900 w-fit"
                >
                  {song.author}
                </Link>
              </div>
            )}
          </div>
        </div>
        {song.original_key && (
          <div className="mt-2">
            <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 rounded-lg px-2.5 py-1 text-sm font-medium">
              🎵 {song.original_key}{song.minor ? 'm' : ''} {song.minor ? 'mol' : 'dur'}
            </span>
          </div>
        )}
        <div className="mt-3 text-sm text-gray-500">
          Śpiewana łącznie: <strong>{song.history.length}</strong> razy
          {song.history.length > 0 && (
            <span className="ml-3">
              Ostatnio: <strong>
                {new Date(song.history[0].service.date).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })}
              </strong>
            </span>
          )}
        </div>
      </div>

      {/* Tagi */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
          Tagi {savingTag && <Loader2 size={12} className="inline animate-spin ml-1 align-middle" />}
        </h2>

        {/* Aktywne tagi — kliknięcie zgłasza do usunięcia */}
        {activeTagIds.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {activeSongTags.map(({ tag, source }) => (
              <button
                key={tag.id}
                onClick={() => toggleTag(tag.id)}
                disabled={savingTag}
                className={`rounded-full px-3 py-2 text-sm font-medium min-h-[44px] transition-all active:scale-95 disabled:opacity-50 ${tagSourceClass(source)}`}
              >
                {tag.name}
              </button>
            ))}
          </div>
        )}

        {/* Oczekuje na zatwierdzenie dodania */}
        {pendingAdditionTags.length > 0 && (
          <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">Dodane — do zatwierdzenia</p>
            <div className="flex flex-wrap gap-2">
              {pendingAdditionTags.map(({ tag }) => (
                <button
                  key={tag.id}
                  onClick={() => cancelPendingAdd(tag.id)}
                  disabled={savingTag}
                  className="rounded-full pl-3 pr-2 py-1.5 text-sm font-medium bg-amber-100 text-amber-700 border border-amber-300 flex items-center gap-1 hover:bg-amber-200 active:scale-95 transition-all disabled:opacity-50"
                >
                  {tag.name}
                  <span className="text-amber-500 text-xs leading-none">×</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Oczekuje na zatwierdzenie usunięcia */}
        {pendingRemovalTags.length > 0 && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2">Do usunięcia — do zatwierdzenia</p>
            <div className="flex flex-wrap gap-2">
              {pendingRemovalTags.map(({ tag }) => (
                <span key={tag.id} className="rounded-full px-3 py-1.5 text-sm font-medium bg-red-100 text-red-400 border border-red-200 line-through">
                  {tag.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Zwijane kategorie */}
        {allTags.length > 0 && (
          <div className="flex flex-col gap-2">
            {categories.map((cat) => {
              const tags = allTags.filter((t) => t.category_id === cat.id)
              return renderTagCategory(cat.id, cat.name, tags)
            })}
            {uncategorized.length > 0 && renderTagCategory('__uncategorized__', 'Inne', uncategorized)}
          </div>
        )}

        {allTags.length === 0 && (
          <p className="text-sm text-gray-400">
            Brak tagów.{' '}
            <Link href="/settings" className="text-blue-900 underline">Dodaj tagi w ustawieniach</Link>
          </p>
        )}
      </div>

      {/* Lightbox zdjęcia autora */}
      {lightbox && song.author_image && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
          onClick={() => setLightbox(false)}
        >
          <img
            src={song.author_image}
            alt={song.author || ''}
            className="max-w-[90vw] max-h-[90vh] rounded-2xl object-contain shadow-2xl"
          />
        </div>
      )}

      {/* Historia śpiewania */}
      {song.history.length > 0 && (
        <div>
          <h2 className="font-semibold text-gray-700 mb-3">Historia śpiewania</h2>
          <ul className="space-y-2">
            {song.history.map((entry) => (
              <li key={entry.id} className="bg-white rounded-xl border border-gray-100 p-3 text-sm">
                <Link href={`/services/${entry.service.id}`} className="hover:text-blue-900">
                  <span className="font-medium">
                    {new Date(entry.service.date).toLocaleDateString('pl-PL', {
                      day: 'numeric', month: 'long', year: 'numeric',
                    })}
                  </span>
                  {entry.service.service_type && (
                    <span className="text-gray-500 ml-2">— {entry.service.service_type.name}</span>
                  )}
                  {entry.service.worship_leader && (
                    <span className="text-gray-400 ml-2">· {entry.service.worship_leader.name}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
