import { createHashRouter, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Dashboard } from './screens/Dashboard'
import { Songs } from './screens/Songs'
import { Services } from './screens/Services'
import { Login } from './screens/Login'
import { Live } from './screens/Live'
import { Settings } from './screens/Settings'
import { Moderation } from './screens/Moderation'

export const router = createHashRouter([
  { path: '/login', element: <Login /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/',
        element: <Layout />,
        children: [
          { index: true, element: <Dashboard /> },
          { path: 'songs', element: <Songs /> },
          { path: 'search', element: <Navigate to="/songs" replace /> },
          { path: 'services', element: <Services /> },
        ],
      },
      { path: '/live/:id', element: <Live /> },
      { path: '/settings', element: <Settings /> },
      { path: '/moderation', element: <Moderation /> },
    ],
  },
])
