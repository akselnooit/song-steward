'use client'

import { Tag, TagCategory } from '@/lib/types'

interface Props {
  // Wszystkie tagi dostępne do wyboru (już przefiltrowane do aktualnych wyników)
  availableTags: Tag[]
  // Aktywne tagi (wybrane przez użytkownika)
  selectedTagIds: string[]
  onToggleTag: (tagId: string) => void
  onClear: () => void
  categories: TagCategory[]
}

export default function TagFilter({
  availableTags,
  selectedTagIds,
  onToggleTag,
  onClear,
  categories,
}: Props) {
  // Grupuj tagi wg kategorii
  const tagsByCategory = categories.reduce<Record<string, Tag[]>>((acc, cat) => {
    const tags = availableTags.filter((t) => t.category_id === cat.id)
    if (tags.length > 0) acc[cat.id] = tags
    return acc
  }, {})

  // Tagi bez kategorii
  const uncategorized = availableTags.filter((t) => !t.category_id)

  const hasAnyTags = availableTags.length > 0 || selectedTagIds.length > 0

  return (
    <div className="space-y-3">
      {/* Aktywne tagi (zawsze widoczne, żeby można było je usunąć) */}
      {selectedTagIds.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 bg-blue-50 rounded-xl">
          <span className="text-xs text-blue-700 font-semibold self-center mr-1">Filtry:</span>
          {selectedTagIds.map((tagId) => {
            const tag = availableTags.find((t) => t.id === tagId) || { id: tagId, name: tagId, category_id: null, description: null, created_at: '' }
            return (
              <button
                key={tagId}
                onClick={() => onToggleTag(tagId)}
                className="bg-blue-900 text-white rounded-full px-3 py-1.5 text-sm font-medium min-h-[36px] flex items-center gap-1"
              >
                {tag.name} <span className="opacity-70">✕</span>
              </button>
            )
          })}
          <button
            onClick={onClear}
            className="text-blue-700 text-sm underline self-center ml-auto"
          >
            Wyczyść
          </button>
        </div>
      )}

      {/* Dostępne tagi pogrupowane wg kategorii */}
      {!hasAnyTags && (
        <p className="text-gray-400 text-sm text-center py-4">Brak tagów do wyświetlenia</p>
      )}

      {categories.map((cat) => {
        const tags = tagsByCategory[cat.id]
        if (!tags || tags.length === 0) return null
        return (
          <div key={cat.id}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              {cat.name}
            </p>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => {
                const isActive = selectedTagIds.includes(tag.id)
                return (
                  <button
                    key={tag.id}
                    onClick={() => onToggleTag(tag.id)}
                    className={`rounded-full px-3 py-2 text-sm font-medium min-h-[44px] transition-colors ${
                      isActive
                        ? 'bg-blue-900 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {tag.name}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}

      {uncategorized.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Inne</p>
          <div className="flex flex-wrap gap-2">
            {uncategorized.map((tag) => {
              const isActive = selectedTagIds.includes(tag.id)
              return (
                <button
                  key={tag.id}
                  onClick={() => onToggleTag(tag.id)}
                  className={`rounded-full px-3 py-2 text-sm font-medium min-h-[44px] transition-colors ${
                    isActive
                      ? 'bg-blue-900 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tag.name}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
