import { Navigate, Outlet } from 'react-router-dom'
import { isAdmin } from '../lib/auth'

export default function AdminRoute() {
  if (!isAdmin()) {
    return <Navigate to="/" replace />
  }
  return <Outlet />
}
