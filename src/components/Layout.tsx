import { Outlet } from 'react-router-dom'
import { TabBar } from './TabBar'

export function Layout() {
  return (
    <>
      <Outlet />
      <TabBar />
    </>
  )
}
