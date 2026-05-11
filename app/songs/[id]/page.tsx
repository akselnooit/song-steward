'use client'

import { use, useState } from 'react'
import useSWR from 'swr'
import { Tag, TagCategory, TagSource } from '@/lib/types'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { fetcher } from '@/lib/fetcher'

interface SongDetail {
  id: string
  number: number
  title: string
  author: string | null
  author_image: string | null
  author_id: string | null
  collection?: { id: string; name: string; short_name: string }
  song_tags: { source: TagSource; tag: Tag & { category?: TagCategory } }[]
  history: {
    id: string
    added_at: string
    service: { id: string; date: string; service_type?: { name: string } }
  }[]
}

export default function SongDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [savingTag, setSavingTag] = useState(false)
  const [lightbox, setLightbox] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  // Dane pieśni i tagów przez SWR — przy powrocie na stronę widoczne natychmiast
  const { data: song, mutate: mutateSong } = useSWR<SongDetail>(`/api/songs/${id}`, fetcher, {
    revalidateOnFocus: false,
  })
  const { data: allTags = [] } = useSWR<(Tag & { category?: TagCategory })[]>('/api/tags', fetcher, {
    revalidateOnFocus: false,
  })

  if (!song) return <div className="text-center py-20 text-gray-400">Ładowanie...</div>

  const currentTagIds = song.song_tags.map((st) => st.tag.id)

  const toggleTag = async (tagId: string) => {
    setSavingTag(true)
    const hasTag = currentTagIds.includes(tagId)

    if (hasTag) {
      await fetch('/api/song-tags', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ song_id: id, tag_id: tagId }),
      })
    } else {
      await fetch('/api/song-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ song_id: id, tag_id: tagId }),
      })
    }

    // Odśwież dane pieśni przez SWR mutate
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

  // Grupuj tagi wg kategorii
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

  // Mapa tagId → source dla aktywnych tagów
  const tagSourceMap = new Map(song.song_tags.map((st) => [st.tag.id, st.source]))

  const collectionLabel = song.collection
    ? `${song.collection.short_name} ${song.number}`
    : `#${song.number}`

  // Pomocnik do renderowania zwijanych kategorii tagów
  const renderTagCategory = (catId: string, catName: string, tags: (Tag & { category?: TagCategory })[]) => {
    const isOpen = expandedCategories.has(catId)
    const activeTags = tags.filter((t) => currentTagIds.includes(t.id))
    const inactiveTags = tags.filter((t) => !currentTagIds.includes(t.id)).sort((a, b) => a.name.localeCompare(b.name, 'pl'))
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
                const active = currentTagIds.includes(tag.id)
                const source = tagSourceMap.get(tag.id)
                return (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.id)}
                    disabled={savingTag}
                    className={`rounded-full px-3 py-2 text-sm font-medium min-h-[44px] transition-all active:scale-95 disabled:opacity-50 ${
                      active ? tagSourceClass(source) : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
      {/* Nagłówek */}
      <Link href="/songs" className="text-sm text-blue-900 mb-4 inline-block">← Wróć</Link>
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

      {/* Tekst pieśni */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Tekst pieśni</h2>
        <p className="text-sm text-gray-400 italic text-center py-6">Tekst zostanie dodany wkrótce</p>
      </div>

      {/* Tagi */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
          Tagi {savingTag && <Loader2 size={12} className="inline animate-spin ml-1 align-middle" />}
        </h2>

        {/* Aktywne tagi */}
        {currentTagIds.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {song.song_tags.map(({ tag, source }) => (
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
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
