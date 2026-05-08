'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/', label: 'Dashboard', icon: '🏠' },
  { href: '/songs', label: 'Pieśni', icon: '🎵' },
  { href: '/search', label: 'Szukaj', icon: '🔖' },
  { href: '/services', label: 'Nabożeństwa', icon: '📅' },
  { href: '/settings', label: 'Ustawienia', icon: '⚙️' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-stretch justify-around">
        {navItems.map((item) => {
          // Aktywny gdy ścieżka zaczyna się od href (lub jest dokładnie '/')
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-2 px-3 flex-1 min-h-[56px] text-xs transition-colors ${
                isActive
                  ? 'text-blue-900 font-semibold'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="text-xl mb-0.5">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
