'use client'

import { useState } from 'react'

interface Props {
  authors: string[]
  selectedAuthors: string[]
  onToggleAuthor: (author: string) => void
}

export default function AuthorFilter({ authors, selectedAuthors, onToggleAuthor }: Props) {
  const [search, setSearch] = useState('')

  const unselected = authors.filter(
    (a) => !selectedAuthors.includes(a) && a.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Autor</p>

      {selectedAuthors.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedAuthors.map((author) => (
            <button
              key={author}
              onClick={() => onToggleAuthor(author)}
              className="bg-amber-600 text-white rounded-full px-3 py-1.5 text-sm font-medium min-h-[36px] flex items-center gap-1 active:scale-95 transition-all"
            >
              {author} <span className="opacity-70">✕</span>
            </button>
          ))}
        </div>
      )}

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Szukaj autora…"
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm mb-2 outline-none focus:border-amber-400"
      />

      <div className="flex flex-wrap gap-2">
        {unselected.map((author) => (
          <button
            key={author}
            onClick={() => onToggleAuthor(author)}
            className="rounded-full px-3 py-2 text-sm font-medium min-h-[44px] bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all active:scale-95 select-none"
          >
            {author}
          </button>
        ))}
        {unselected.length === 0 && search.length > 0 && (
          <p className="text-sm text-gray-400">Brak wyników</p>
        )}
        {unselected.length === 0 && search.length === 0 && selectedAuthors.length > 0 && (
          <p className="text-sm text-gray-400">Wszyscy autorzy zaznaczeni</p>
        )}
      </div>
    </div>
  )
}
