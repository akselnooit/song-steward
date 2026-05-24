'use client'

import { useRef } from 'react'
import { Tag, TagCategory } from '@/lib/types'
import AuthorFilter from './AuthorFilter'

interface Props {
  availableTags: Tag[]
  selectedTagIds: string[]
  excludedTagIds: string[]
  onToggleTag: (tagId: string) => void
  onToggleExclude: (tagId: string) => void
  onClear: () => void
  categories: TagCategory[]
  hideActiveFilters?: boolean
  authors?: string[]
  selectedAuthors?: string[]
  onToggleAuthor?: (author: string) => void
}

export default function TagFilter({
  availableTags,
  selectedTagIds,
  excludedTagIds,
  onToggleTag,
  onToggleExclude,
  onClear,
  categories,
  hideActiveFilters = false,
  authors,
  selectedAuthors = [],
  onToggleAuthor,
}: Props) {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const didLongPress = useRef(false)
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  const SCROLL_THRESHOLD = 8

  const handlePressStart = (tagId: string, e: React.TouchEvent | React.MouseEvent) => {
    didLongPress.current = false
    if ('touches' in e) {
      touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    } else {
      touchStart.current = null
    }
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true
      onToggleExclude(tagId)
    }, 500)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart.current || !longPressTimer.current) return
    const dx = Math.abs(e.touches[0].clientX - touchStart.current.x)
    const dy = Math.abs(e.touches[0].clientY - touchStart.current.y)
    if (dx > SCROLL_THRESHOLD || dy > SCROLL_THRESHOLD) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  const handlePressEnd = (tagId: string, e: React.MouseEvent | React.TouchEvent) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
    } else if ('changedTouches' in e) {
      // long press timer was cancelled due to scroll — don't select
      return
    }
    if (didLongPress.current) {
      e.preventDefault()
      return
    }
    if ('changedTouches' in e && touchStart.current) {
      const dx = Math.abs(e.changedTouches[0].clientX - touchStart.current.x)
      const dy = Math.abs(e.changedTouches[0].clientY - touchStart.current.y)
      if (dx > SCROLL_THRESHOLD || dy > SCROLL_THRESHOLD) return
    }
    onToggleTag(tagId)
  }

  const handlePressCancel = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current)
    longPressTimer.current = null
  }

  const tagsByCategory = categories.reduce<Record<string, Tag[]>>((acc, cat) => {
    const tags = availableTags.filter((t) => t.category_id === cat.id)
    if (tags.length > 0) acc[cat.id] = tags
    return acc
  }, {})

  const uncategorized = availableTags.filter((t) => !t.category_id)
  const hasAnyTags = availableTags.length > 0 || selectedTagIds.length > 0 || excludedTagIds.length > 0

  const renderTag = (tag: Tag) => {
    const isSelected = selectedTagIds.includes(tag.id)
    const isExcluded = excludedTagIds.includes(tag.id)

    let className = 'rounded-full px-3 py-2 text-sm font-medium min-h-[44px] transition-all active:scale-95 select-none '
    if (isExcluded) {
      className += 'bg-red-100 text-red-600 line-through'
    } else if (isSelected) {
      className += 'bg-blue-900 text-white'
    } else {
      className += 'bg-gray-100 text-gray-700 hover:bg-gray-200'
    }

    return (
      <button
        key={tag.id}
        className={className}
        onMouseDown={(e) => handlePressStart(tag.id, e)}
        onMouseUp={(e) => handlePressEnd(tag.id, e)}
        onMouseLeave={handlePressCancel}
        onTouchStart={(e) => handlePressStart(tag.id, e)}
        onTouchMove={handleTouchMove}
        onTouchEnd={(e) => handlePressEnd(tag.id, e)}
        onTouchCancel={handlePressCancel}
        onContextMenu={(e) => e.preventDefault()}
      >
        {isExcluded ? `✕ ${tag.name}` : tag.name}
      </button>
    )
  }

  return (
    <div className="space-y-3">
      {!hideActiveFilters && (selectedTagIds.length > 0 || excludedTagIds.length > 0) && (
        <div className="flex flex-wrap gap-2 p-3 bg-blue-50 rounded-xl">
          <span className="text-xs text-blue-700 font-semibold self-center mr-1">Filtry:</span>
          {selectedTagIds.map((tagId) => {
            const tag = availableTags.find((t) => t.id === tagId) || { id: tagId, name: tagId, category_id: null, description: null, created_at: '' }
            return (
              <button
                key={tagId}
                onClick={() => onToggleTag(tagId)}
                className="bg-blue-900 text-white rounded-full px-3 py-1.5 text-sm font-medium min-h-[36px] flex items-center gap-1 transition-all active:scale-95"
              >
                {tag.name} <span className="opacity-70">✕</span>
              </button>
            )
          })}
          {excludedTagIds.map((tagId) => {
            const tag = availableTags.find((t) => t.id === tagId) || { id: tagId, name: tagId, category_id: null, description: null, created_at: '' }
            return (
              <button
                key={`excl-${tagId}`}
                onClick={() => onToggleExclude(tagId)}
                className="bg-red-100 text-red-600 rounded-full px-3 py-1.5 text-sm font-medium min-h-[36px] flex items-center gap-1 line-through transition-all active:scale-95"
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
              {tags.map(renderTag)}
            </div>
          </div>
        )
      })}

      {uncategorized.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Inne</p>
          <div className="flex flex-wrap gap-2">
            {uncategorized.map(renderTag)}
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 text-center pt-1">Przytrzymaj tag, aby go wykluczyć</p>

      {authors && onToggleAuthor && (
        <div className="border-t border-gray-100 pt-3 mt-1">
          <AuthorFilter
            authors={authors}
            selectedAuthors={selectedAuthors}
            onToggleAuthor={onToggleAuthor}
          />
        </div>
      )}
    </div>
  )
}
