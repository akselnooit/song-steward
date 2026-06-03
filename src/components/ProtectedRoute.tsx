import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { SongOverlayProvider } from '../contexts/SongOverlayContext'
import { SongOverlay } from './SongOverlay'

export function ProtectedRoute() {
  const [authed, setAuthed] = useState<boolean | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAuthed(!!data.session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setAuthed(!!session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (authed === null) return <div className="app" />
  if (!authed) return <Navigate to="/login" replace />
  return (
    <SongOverlayProvider>
      <Outlet />
      <SongOverlay />
    </SongOverlayProvider>
  )
}
