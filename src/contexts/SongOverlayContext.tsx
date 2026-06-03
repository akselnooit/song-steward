import { createContext, useContext, useState, useCallback, useMemo, useRef } from 'react'

interface SongOverlayContextValue {
  songId: string | null
  navSongIds: string[]
  openSong: (songId: string, navSongIds?: string[]) => void
  closeSong: () => void
  goPrev: () => void
  goNext: () => void
  canGoPrev: boolean
  canGoNext: boolean
}

const Ctx = createContext<SongOverlayContextValue | null>(null)

export function SongOverlayProvider({ children }: { children: React.ReactNode }) {
  const [songId, setSongId] = useState<string | null>(null)
  const [navSongIds, setNavSongIds] = useState<string[]>([])
  // Mirror of navSongIds for use inside the stable goPrev/goNext callbacks,
  // so they never go stale and never change identity (critical: the touch-gesture
  // effect in SongOverlay depends on these — unstable identities caused the effect
  // to rebind every render and reset gesture state mid-swipe).
  const navRef = useRef<string[]>([])

  const openSong = useCallback((id: string, nav: string[] = []) => {
    navRef.current = nav
    setNavSongIds(nav)
    setSongId(id)
  }, [])

  const closeSong = useCallback(() => setSongId(null), [])

  const goPrev = useCallback(() => {
    setSongId(cur => {
      const i = cur ? navRef.current.indexOf(cur) : -1
      return i > 0 ? navRef.current[i - 1] : cur
    })
  }, [])

  const goNext = useCallback(() => {
    setSongId(cur => {
      const i = cur ? navRef.current.indexOf(cur) : -1
      return i >= 0 && i < navRef.current.length - 1 ? navRef.current[i + 1] : cur
    })
  }, [])

  const idx = songId ? navSongIds.indexOf(songId) : -1
  const canGoPrev = idx > 0
  const canGoNext = idx >= 0 && idx < navSongIds.length - 1

  const value = useMemo<SongOverlayContextValue>(() => ({
    songId, navSongIds, openSong, closeSong, goPrev, goNext, canGoPrev, canGoNext,
  }), [songId, navSongIds, openSong, closeSong, goPrev, goNext, canGoPrev, canGoNext])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useSongOverlay() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useSongOverlay must be used inside SongOverlayProvider')
  return ctx
}
