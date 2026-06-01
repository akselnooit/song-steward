import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SongOverlayProvider } from './contexts/SongOverlayContext'
import { SongOverlay } from './components/SongOverlay'
import { router } from './router'
import './index.css'

const savedTheme = localStorage.getItem('ss-theme') ?? 'dark'
document.documentElement.setAttribute('data-theme', savedTheme)

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <SongOverlayProvider>
        <div className="app">
          <RouterProvider router={router} />
          <SongOverlay />
        </div>
      </SongOverlayProvider>
    </QueryClientProvider>
  </StrictMode>,
)
