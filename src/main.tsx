import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { router } from './router'
import './index.css'

const savedTheme = localStorage.getItem('ss-theme') ?? 'dark'
document.documentElement.setAttribute('data-theme', savedTheme)

// Supabase po kliknięciu w link wrzuca parametry prosto do hasha (#access_token=... lub #error=...)
// zanim React Router zdąży cokolwiek zrobić. Przekieruj na właściwą trasę routera.
const rawHash = window.location.hash
if (rawHash && !rawHash.startsWith('#/')) {
  const params = new URLSearchParams(rawHash.slice(1))
  if (params.has('error_code')) {
    const code = params.get('error_code') ?? 'unknown'
    window.location.replace(window.location.pathname + `#/login?auth_error=${encodeURIComponent(code)}`)
  }
  // access_token — Supabase SDK obsłuży przez onAuthStateChange automatycznie
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
})

const isStaging = import.meta.env.BASE_URL.includes('staging')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <div className="app">
        {isStaging && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
            background: 'oklch(0.75 0.18 55 / 0.55)',
            color: 'oklch(0.15 0.05 55)',
            textAlign: 'center',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.08em',
            padding: '3px 0',
            pointerEvents: 'none',
          }}>
            STAGING
          </div>
        )}
        <RouterProvider router={router} />
      </div>
    </QueryClientProvider>
  </StrictMode>,
)
