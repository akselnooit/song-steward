import { NavLink } from 'react-router-dom'
import { Home, Music, Search, CalendarDays } from 'lucide-react'

const tabs = [
  { to: '/', label: 'Pulpit', Icon: Home },
  { to: '/songs', label: 'Pieśni', Icon: Music },
  { to: '/search', label: 'Szukaj', Icon: Search },
  { to: '/services', label: 'Nabożeństwa', Icon: CalendarDays },
]

export function TabBar() {
  return (
    <nav className="tabbar">
      {tabs.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
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
