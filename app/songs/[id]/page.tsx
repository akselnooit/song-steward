'use client'

import { useEffect, useState, use } from 'react'
import { Tag, TagCategory } from '@/lib/types'
import Link from 'next/link'

interface SongDetail {
  id: string
  number: number
  title: string
  author: string | null
  author_image: string | null
  author_id: string | null
  collection?: { id: string; name: string; short_name: string }
  song_tags: { tag: Tag & { category?: TagCategory } }[]
  history: {
    id: string
    added_at: string
    service: { id: string; date: string; service_type?: { name: string } }
  }[]
}

export default function SongDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [song, setSong] = useState<SongDetail | null>(null)
  const [allTags, setAllTags] = useState<(Tag & { category?: TagCategory })[]>([])
  const [loading, setLoading] = useState(true)
  const [savingTag, setSavingTag] = useState(false)
  const [lightbox, setLightbox] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  useEffect(() => {
    Promise.all([
      fetch(`/api/songs/${id}`).then((r) => r.json()),
      fetch('/api/tags').then((r) => r.json()),
    ]).then(([songData, tagsData]) => {
      setSong(songData)
      setAllTags(tagsData)
      setLoading(false)
    })
  }, [id])

  if (loading) return <div className="text-center py-20 text-gray-400">Ładowanie...</div>
  if (!song) return <div className="text-center py-20 text-gray-400">Nie znaleziono pieśni</div>

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

    // Odśwież dane pieśni
    const updated = await fetch(`/api/songs/${id}`).then((r) => r.json())
    setSong(updated)
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
        {isOpen && (
          <div className="px-3 py-2.5 flex flex-wrap gap-2 bg-white">
            {sortedTags.map((tag) => {
              const active = currentTagIds.includes(tag.id)
              return (
                <button
                  key={tag.id}
                  onClick={() => toggleTag(tag.id)}
                  disabled={savingTag}
                  className={`rounded-full px-3 py-2 text-sm font-medium min-h-[44px] transition-colors disabled:opacity-50 ${
                    active ? 'bg-blue-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tag.name}
                </button>
              )
            })}
          </div>
        )}
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
          Tagi {savingTag && <span className="font-normal normal-case">zapisywanie...</span>}
        </h2>

        {/* Aktywne tagi */}
        {currentTagIds.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {song.song_tags.map(({ tag }) => (
              <button
                key={tag.id}
                onClick={() => toggleTag(tag.id)}
                disabled={savingTag}
                className="rounded-full px-3 py-2 text-sm font-medium min-h-[44px] bg-blue-900 text-white transition-colors disabled:opacity-50"
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
