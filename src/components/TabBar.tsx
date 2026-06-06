import { NavLink, useLocation } from 'react-router-dom'
import { Home, Music, CalendarDays } from 'lucide-react'

const tabs = [
  { to: '/', label: 'Pulpit', Icon: Home, end: true },
  { to: '/songs', label: 'Pieśni', Icon: Music, end: false },
  { to: '/services', label: 'Nabożeństwa', Icon: CalendarDays, end: false },
]

export function TabBar() {
  const { pathname } = useLocation()
  const activeIndex = tabs.findIndex(t => t.end ? pathname === t.to : pathname.startsWith(t.to))

  return (
    <nav className="tabbar">
      {activeIndex >= 0 && (
        <span className="tab-capsule" aria-hidden style={{ '--active': activeIndex } as React.CSSProperties} />
      )}
      {tabs.map(({ to, label, Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) => `tab${isActive ? ' active' : ''}`}
        >
          <div className="tab-dot" />
          <Icon size={22} strokeWidth={1.7} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
