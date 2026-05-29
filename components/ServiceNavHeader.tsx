'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

interface ServiceNavHeaderProps {
  currentId: string
}

export default function ServiceNavHeader({ currentId }: ServiceNavHeaderProps) {
  const router = useRouter()
  const [navIds, setNavIds] = useState<string[]>([])

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('ss_service_nav')
      if (stored) {
        const ids = JSON.parse(stored) as string[]
        if (Array.isArray(ids)) setNavIds(ids)
      }
    } catch {
      // ignore parse errors
    }
  }, [])

  const currentIndex = navIds.indexOf(currentId)
  const total = navIds.length
  const hasPrev = currentIndex > 0
  const hasNext = currentIndex >= 0 && currentIndex < total - 1
  const showCounter = total > 1 && currentIndex >= 0

  const goPrev = () => {
    if (hasPrev) router.push(`/services/${navIds[currentIndex - 1]}`)
  }

  const goNext = () => {
    if (hasNext) router.push(`/services/${navIds[currentIndex + 1]}`)
  }

  return (
    <div className="flex items-center justify-between mb-3">
      {/* Close button — top left */}
      <button
        onClick={() => router.push('/services')}
        aria-label="Wróć do listy"
        className="flex items-center justify-center w-9 h-9 rounded-full text-blue-900 hover:bg-blue-50 active:scale-95 transition-all"
      >
        <X size={20} />
      </button>

      {/* Counter + chevrons — top right, only when multiple services */}
      {showCounter && (
        <div className="flex items-center gap-1">
          <button
            onClick={goPrev}
            disabled={!hasPrev}
            aria-label="Poprzednie nabożeństwo"
            className={`flex items-center justify-center w-9 h-9 rounded-full transition-all active:scale-95 ${
              hasPrev
                ? 'text-blue-900 hover:bg-blue-50'
                : 'text-gray-200 cursor-default'
            }`}
          >
            <ChevronLeft size={20} />
          </button>

          <span className="text-xs text-gray-500 min-w-[3rem] text-center tabular-nums">
            {currentIndex + 1} / {total}
          </span>

          <button
            onClick={goNext}
            disabled={!hasNext}
            aria-label="Następne nabożeństwo"
            className={`flex items-center justify-center w-9 h-9 rounded-full transition-all active:scale-95 ${
              hasNext
                ? 'text-blue-900 hover:bg-blue-50'
                : 'text-gray-200 cursor-default'
            }`}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}
    </div>
  )
}
