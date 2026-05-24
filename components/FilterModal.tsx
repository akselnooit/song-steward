'use client'

import { ReactNode } from 'react'

export default function FilterModal({
  open,
  onClose,
  children,
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[55] bg-black/50 flex items-end" onClick={onClose}>
      <div
        className="w-full bg-white rounded-t-2xl pt-4 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] max-h-[80vh] overflow-y-auto overscroll-contain"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Filtruj</h3>
          <button
            onClick={onClose}
            className="bg-blue-900 text-white rounded-xl px-4 py-2 text-sm font-medium active:scale-95 transition-all"
          >
            Gotowe
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
