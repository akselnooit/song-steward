'use client'

import { useEffect, useRef, useState } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, X, Loader2 } from 'lucide-react'
import { useSongOverlay } from '@/contexts/SongOverlayContext'
import { fetcher } from '@/lib/fetcher'
import { Tag, TagCategory, TagSource } from '@/lib/types'

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

// Fixed elements (toast, lightbox) must be rendered outside the panel div because
// the panel has CSS transform applied, which creates a new containing block for
// position:fixed children, making them fixed relative to the panel, not the viewport.
function SongOverlayContent({
  songId,
  onClose,
  onToast,
  onLightbox,
  onGoNext,
  onGoPrev,
}: {
  songId: string
  onClose: () => void
  onToast: (msg: string | null) => void
  onLightbox: (src: string, alt: string) => void
  onGoNext: () => void
  onGoPrev: () => void
}) {
  const { state } = useSongOverlay()
  const { serviceCtx, queue, index, initialStatus } = state

  const [savingTag, setSavingTag] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [addedStatus, setAddedStatus] = useState<'planned' | 'sung' | null>(initialStatus ?? null)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    setAddedStatus(initialStatus ?? null)
    setExpandedCategories(new Set())
  }, [songId, initialStatus])

  const { data: song, mutate: mutateSong } = useSWR<SongDetail>(
    `/api/songs/${songId}`,
    fetcher,
    { revalidateOnFocus: false },
  )
  const { data: allTags = [] } = useSWR<(Tag & { category?: TagCategory })[]>('/api/tags', fetcher, {
    revalidateOnFocus: false,
  })

  const addToService = async (status: 'planned' | 'sung') => {
    if (!serviceCtx || adding) return
    setAdding(true)
    await fetch('/api/service-songs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ service_id: serviceCtx.serviceId, song_id: songId, status }),
    })
    setAddedStatus(status)
    setAdding(false)
    onToast(status === 'planned' ? 'Zaplanowana' : 'Zaśpiewana')
    setTimeout(() => onToast(null), 2000)
  }

  const toggleTag = async (tagId: string) => {
    if (!song) return
    setSavingTag(true)
    const existing = song.song_tags.find((st) => st.tag.id === tagId)
    if (existing?.pending_removal) {
      await fetch('/api/song-tags', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ song_id: songId, tag_id: tagId, action: 'restore' }),
      })
    } else if (existing) {
      await fetch('/api/song-tags', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ song_id: songId, tag_id: tagId }),
      })
    } else {
      await fetch('/api/song-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ song_id: songId, tag_id: tagId }),
      })
    }
    await mutateSong()
    setSavingTag(false)
  }

  const cancelPendingRemoval = async (tagId: string) => {
    setSavingTag(true)
    await fetch('/api/song-tags', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ song_id: songId, tag_id: tagId, action: 'restore' }),
    })
    await mutateSong()
    setSavingTag(false)
  }

  const cancelPendingAdd = async (tagId: string) => {
    setSavingTag(true)
    await fetch('/api/song-tags', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ song_id: songId, tag_id: tagId, action: 'cancel_add' }),
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

  const tagSourceClass = (source: TagSource | undefined) => {
    if (source === 'user') return 'bg-amber-100 text-amber-700 border border-amber-300'
    if (source === 'ai') return 'bg-purple-100 text-purple-700 border border-purple-200'
    return 'bg-blue-900 text-white'
  }

  if (!song) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 size={24} className="animate-spin text-gray-400" />
      </div>
    )
  }

  const activeSongTags = song.song_tags.filter((st) => !st.pending_removal)
  const activeTagIds = activeSongTags.map((st) => st.tag.id)
  const pendingRemovalTags = song.song_tags.filter((st) => st.pending_removal)
  const pendingRemovalTagIds = pendingRemovalTags.map((st) => st.tag.id)
  const pendingAdditionTags = activeSongTags.filter((st) => st.source === 'user')
  const tagSourceMap = new Map(song.song_tags.map((st) => [st.tag.id, st.source]))

  const collectionLabel = song.collection
    ? `${song.collection.short_name} ${song.number}`
    : `#${song.number}`

  const categories = Array.from(
    new Map(
      allTags.filter((t) => t.category).map((t) => [t.category!.id, t.category!])
    ).values()
  )
  const uncategorized = allTags.filter((t) => !t.category_id)

  const renderTagCategory = (catId: string, catName: string, tags: (Tag & { category?: TagCategory })[]) => {
    const isOpen = expandedCategories.has(catId)
    const activeTags = tags.filter((t) => activeTagIds.includes(t.id))
    const inactiveTags = tags
      .filter((t) => !activeTagIds.includes(t.id))
      .sort((a, b) => a.name.localeCompare(b.name, 'pl'))
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
    <div className="px-4 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between py-3 mb-1">
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Zamknij"
        >
          <X size={20} className="text-gray-500" />
        </button>
        {queue.length > 1 && (
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-400 mr-1">{index + 1}/{queue.length}</span>
            <button
              onClick={onGoPrev}
              className="p-1.5 rounded-lg text-blue-900 hover:bg-blue-50 active:scale-95 transition-all"
              title="Poprzednia"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={onGoNext}
              className="p-1.5 rounded-lg text-blue-900 hover:bg-blue-50 active:scale-95 transition-all"
              title="Następna"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>

      {/* Service context */}
      {serviceCtx && (
        <div className="mb-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
          <p className="text-xs text-blue-700 mb-2">
            Nabożeństwo: <span className="font-semibold">{serviceCtx.serviceName}</span>
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => addToService('planned')}
              disabled={adding || addedStatus === 'planned' || addedStatus === 'sung'}
              className={`flex-1 rounded-xl py-2 text-sm font-medium min-h-[44px] transition-all active:scale-95 ${
                addedStatus === 'planned'
                  ? 'bg-green-100 text-green-700 border border-green-200'
                  : addedStatus === 'sung'
                  ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-blue-50'
              }`}
            >
              {addedStatus === 'planned' ? '✅ Zaplanowana' : '🔖 Zaplanuj'}
            </button>
            <button
              onClick={() => addToService('sung')}
              disabled={adding || addedStatus === 'sung'}
              className={`flex-1 rounded-xl py-2 text-sm font-medium min-h-[44px] transition-all active:scale-95 ${
                addedStatus === 'sung'
                  ? 'bg-green-100 text-green-700 border border-green-200'
                  : 'bg-blue-900 text-white hover:bg-blue-800'
              }`}
            >
              {addedStatus === 'sung' ? '✅ Zaśpiewana' : '✅ Zaśpiewana'}
            </button>
          </div>
        </div>
      )}

      {/* Song info */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
        <div className="flex items-start gap-3">
          <span className="bg-blue-900 text-white rounded-lg px-2.5 py-1 text-sm font-bold shrink-0">
            {collectionLabel}
          </span>
          <div>
            <h2 className="text-lg font-bold text-gray-900">{song.title}</h2>
            {song.author && (
              <div className="flex items-center gap-1.5 mt-0.5">
                {song.author_image && (
                  <button
                    onClick={() => onLightbox(song.author_image!, song.author!)}
                    className="shrink-0 focus:outline-none"
                    aria-label="Pokaż zdjęcie autora"
                  >
                    <img
                      src={song.author_image}
                      alt={song.author}
                      className="w-5 h-5 rounded-full object-cover hover:opacity-80 transition-opacity"
                    />
                  </button>
                )}
                <Link
                  href={`/songs?author_id=${song.author_id}&author_name=${encodeURIComponent(song.author)}`}
                  className="text-sm text-gray-500 hover:text-blue-900 w-fit"
                  onClick={onClose}
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
              Ostatnio:{' '}
              <strong>
                {new Date(song.history[0].service.date).toLocaleDateString('pl-PL', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </strong>
            </span>
          )}
        </div>
      </div>

      {/* Tags */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
          Tagi {savingTag && <Loader2 size={12} className="inline animate-spin ml-1 align-middle" />}
        </h3>

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

        {pendingAdditionTags.length > 0 && (
          <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">
              Dodane — do zatwierdzenia
            </p>
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

        {pendingRemovalTags.length > 0 && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2">
              Do usunięcia — do zatwierdzenia
            </p>
            <div className="flex flex-wrap gap-2">
              {pendingRemovalTags.map(({ tag }) => (
                <button
                  key={tag.id}
                  onClick={() => cancelPendingRemoval(tag.id)}
                  disabled={savingTag}
                  className="rounded-full pl-3 pr-2 py-1.5 text-sm font-medium bg-red-100 text-red-400 border border-red-200 flex items-center gap-1 hover:bg-red-200 active:scale-95 transition-all disabled:opacity-50"
                >
                  <span className="line-through">{tag.name}</span>
                  <span className="text-red-400 text-xs leading-none">×</span>
                </button>
              ))}
            </div>
          </div>
        )}

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
          <p className="text-sm text-gray-400">Brak tagów.</p>
        )}
      </div>

      {/* History */}
      {song.history.length > 0 && (
        <div className="mb-4">
          <h3 className="font-semibold text-gray-700 mb-3">Historia śpiewania</h3>
          <ul className="space-y-2">
            {song.history.map((entry) => (
              <li key={entry.id} className="bg-white rounded-xl border border-gray-100 p-3 text-sm">
                <Link
                  href={`/services/${entry.service.id}`}
                  className="hover:text-blue-900"
                  onClick={onClose}
                >
                  <span className="font-medium">
                    {new Date(entry.service.date).toLocaleDateString('pl-PL', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
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

export default function SongOverlay() {
  const { state, closeSong, goNext, goPrev } = useSongOverlay()
  const { isOpen, songId } = state

  const panelRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  // Tracks swipe/arrow direction so the content slides the right way
  const navDirRef = useRef<'next' | 'prev'>('next')

  // Toast and lightbox are rendered outside the panel to avoid
  // CSS transform containing-block issues with position:fixed
  const [toast, setToast] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null)

  // Navigation wrappers — record direction before updating state
  const handleGoNext = () => { navDirRef.current = 'next'; goNext() }
  const handleGoPrev = () => { navDirRef.current = 'prev'; goPrev() }

  // Slide the content area in from the appropriate side on each song change.
  // el.offsetHeight forces a reflow so the browser registers the animation reset.
  useEffect(() => {
    const el = contentRef.current
    if (!el || !songId) return
    el.style.animation = 'none'
    void el.offsetHeight // reflow
    el.style.animation =
      navDirRef.current === 'next'
        ? 'overlaySlideInRight 220ms ease-out'
        : 'overlaySlideInLeft 220ms ease-out'
  }, [songId])

  // Reset scroll and lightbox when song changes
  useEffect(() => {
    if (panelRef.current) panelRef.current.scrollTop = 0
    setLightbox(null)
  }, [songId])

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (lightbox) { setLightbox(null); return }
        if (isOpen) closeSong()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, lightbox, closeSong])

  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y
    touchStartRef.current = null

    const absDx = Math.abs(dx)
    const absDy = Math.abs(dy)

    // Swipe down to close (only when panel is scrolled to top)
    if (dy > 80 && absDy > absDx && (panelRef.current?.scrollTop ?? 0) === 0) {
      closeSong()
      return
    }

    // Horizontal swipe to navigate — never closes the panel
    if (absDx > 60 && absDx > absDy && state.queue.length > 1) {
      if (dx < 0) handleGoNext()
      else handleGoPrev()
    }
  }

  if (!songId && !isOpen) return null

  return (
    <>
      <style>{`
        @keyframes overlaySlideInRight {
          from { transform: translateX(48px); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes overlaySlideInLeft {
          from { transform: translateX(-48px); opacity: 0; }
          to   { transform: translateX(0);     opacity: 1; }
        }
      `}</style>

      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[60] bg-black/40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeSong}
      />

      {/* Slide panel — touch-action:pan-y prevents browser horizontal swipe
          navigation from competing with our JS swipe handler */}
      <div
        ref={panelRef}
        className={`fixed inset-y-0 right-0 z-[61] w-full max-w-lg bg-gray-50 shadow-2xl overflow-y-auto transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ touchAction: 'pan-y', overscrollBehavior: 'contain' }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Content wrapper — animated on each song change */}
        <div ref={contentRef}>
          {songId && (
            <SongOverlayContent
              songId={songId}
              onClose={closeSong}
              onToast={setToast}
              onLightbox={(src, alt) => setLightbox({ src, alt })}
              onGoNext={handleGoNext}
              onGoPrev={handleGoPrev}
            />
          )}
        </div>
      </div>

      {/* Toast — outside panel, not affected by panel transform */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-green-700 text-white px-4 py-2 rounded-full text-sm font-medium z-[70] shadow-lg pointer-events-none">
          {toast} dodana
        </div>
      )}

      {/* Lightbox — outside panel, not affected by panel transform */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[80] bg-black/80 flex items-center justify-center"
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox.src}
            alt={lightbox.alt}
            className="max-w-[90vw] max-h-[90vh] rounded-2xl object-contain shadow-2xl"
          />
        </div>
      )}
    </>
  )
}
