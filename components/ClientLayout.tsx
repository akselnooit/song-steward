'use client'

import { SongOverlayProvider } from '@/contexts/SongOverlayContext'
import SongOverlay from '@/components/SongOverlay'
import BottomNav from '@/components/BottomNav'

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <SongOverlayProvider>
      {children}
      <BottomNav />
      <SongOverlay />
    </SongOverlayProvider>
  )
}
