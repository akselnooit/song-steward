'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Music, Search, Calendar, Settings, BarChart3 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const navItems: { href: string; label: string; Icon: LucideIcon; desktopOnly?: boolean }[] = [
  { href: '/', label: 'Dashboard', Icon: Home },
  { href: '/songs', label: 'Pieśni', Icon: Music },
  { href: '/search', label: 'Szukaj', Icon: Search },
  { href: '/services', label: 'Nabożeństwa', Icon: Calendar },
  { href: '/settings', label: 'Ustawienia', Icon: Settings },
  { href: '/desk', label: 'Panel', Icon: BarChart3, desktopOnly: true },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-stretch justify-around">
        {navItems.map(({ href, label, Icon, desktopOnly }) => {
          const isActive =
            href === '/'
              ? pathname === '/'
              : pathname.startsWith(href)

          return (
            <Link
              key={href}
              href={href}
              prefetch={true}
              className={`${desktopOnly ? 'hidden lg:flex' : 'flex'} flex-col items-center justify-center py-2 px-3 flex-1 min-h-[56px] text-xs transition-colors active:scale-95 transition-all ${
                isActive
                  ? 'text-blue-900 font-semibold'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon
                size={22}
                className={`mb-0.5 transition-transform duration-200 ${isActive ? 'scale-110 -translate-y-0.5' : ''}`}
              />
              <span>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
