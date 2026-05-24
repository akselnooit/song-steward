'use client'

import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react'

export interface ServiceCtx {
  serviceId: string
  serviceName: string
}

export interface OverlayState {
  isOpen: boolean
  songId: string | null
  queue: string[]
  index: number
  serviceCtx: ServiceCtx | null
  initialStatus: 'planned' | 'sung' | null
}

interface SongOverlayContextValue {
  state: OverlayState
  openSong: (
    songId: string,
    queue?: string[],
    serviceCtx?: ServiceCtx | null,
    initialStatus?: 'planned' | 'sung' | null,
  ) => void
  closeSong: () => void
  goNext: () => void
  goPrev: () => void
}

const SongOverlayContext = createContext<SongOverlayContextValue | null>(null)

export function SongOverlayProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OverlayState>({
    isOpen: false,
    songId: null,
    queue: [],
    index: 0,
    serviceCtx: null,
    initialStatus: null,
  })

  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const openSong = useCallback((
    songId: string,
    queue: string[] = [],
    serviceCtx: ServiceCtx | null = null,
    initialStatus: 'planned' | 'sung' | null = null,
  ) => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
    const index = queue.indexOf(songId)
    setState({ isOpen: true, songId, queue, index: index === -1 ? 0 : index, serviceCtx, initialStatus })
  }, [])

  const closeSong = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false }))
    closeTimerRef.current = setTimeout(() => {
      setState((prev) => ({ ...prev, songId: null }))
      closeTimerRef.current = null
    }, 300)
  }, [])

  const goNext = useCallback(() => {
    setState((prev) => {
      if (!prev.queue.length) return prev
      const nextIndex = (prev.index + 1) % prev.queue.length
      return { ...prev, songId: prev.queue[nextIndex], index: nextIndex, initialStatus: null }
    })
  }, [])

  const goPrev = useCallback(() => {
    setState((prev) => {
      if (!prev.queue.length) return prev
      const prevIndex = (prev.index - 1 + prev.queue.length) % prev.queue.length
      return { ...prev, songId: prev.queue[prevIndex], index: prevIndex, initialStatus: null }
    })
  }, [])

  return (
    <SongOverlayContext.Provider value={{ state, openSong, closeSong, goNext, goPrev }}>
      {children}
    </SongOverlayContext.Provider>
  )
}

export function useSongOverlay() {
  const ctx = useContext(SongOverlayContext)
  if (!ctx) throw new Error('useSongOverlay must be used within SongOverlayProvider')
  return ctx
}
