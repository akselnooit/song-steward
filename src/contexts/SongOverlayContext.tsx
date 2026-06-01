import { createContext, useContext, useState } from 'react'

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

  const idx = songId ? navSongIds.indexOf(songId) : -1
  const canGoPrev = idx > 0
  const canGoNext = idx >= 0 && idx < navSongIds.length - 1

  return (
    <Ctx.Provider value={{
      songId,
      navSongIds,
      canGoPrev,
      canGoNext,
      openSong: (id, nav = []) => { setSongId(id); setNavSongIds(nav) },
      closeSong: () => setSongId(null),
      goPrev: () => { if (canGoPrev) setSongId(navSongIds[idx - 1]) },
      goNext: () => { if (canGoNext) setSongId(navSongIds[idx + 1]) },
    }}>
      {children}
    </Ctx.Provider>
  )
}

export function useSongOverlay() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useSongOverlay must be used inside SongOverlayProvider')
  return ctx
}
