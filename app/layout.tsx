import type { Metadata, Viewport } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import ClientLayout from '@/components/ClientLayout'

const geist = Geist({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Song Steward',
  description: 'Zarządzanie pieśniami i nabożeństwami',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Song Steward',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1e3a5f',
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pl">
      <head>
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className={`${geist.className} bg-gray-50 text-gray-900`}>
        <ClientLayout>
          <main className="min-h-screen pb-[calc(5rem+env(safe-area-inset-bottom))]">
            {children}
          </main>
        </ClientLayout>
      </body>
    </html>
  )
}
