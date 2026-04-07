import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Monitor,
  Users,
  ClipboardList,
  Wrench,
  Menu,
  X,
  LogOut,
  ShieldCheck,
} from 'lucide-react'
import { useState } from 'react'
import { logout, getSession } from '../lib/auth'

const mainLinks = [
  { to: '/',               icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/equipos',        icon: Monitor,         label: 'Equipos' },
  { to: '/usuarios',       icon: Users,           label: 'Usuarios' },
  { to: '/asignaciones',   icon: ClipboardList,   label: 'Asignaciones' },
  { to: '/mantenimientos', icon: Wrench,          label: 'Mantenimientos' },
]

export default function Sidebar() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const session = getSession()
  const isAdmin = session?.rol === 'admin'

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 bg-white p-2 rounded-lg shadow"
        onClick={() => setOpen(!open)}
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay mobile */}
      {open && (
        <div
          className="md:hidden fixed inset-0 bg-black/30 z-30"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-64 bg-white border-r border-slate-200 z-40
          flex flex-col
          transition-transform duration-200
          ${open ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0 md:static md:flex
        `}
      >
        {/* Logo */}
        <div className="px-6 py-5 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <Monitor size={16} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-slate-800 text-sm leading-none">FERCO</p>
              <p className="text-xs text-slate-500 mt-0.5">Gestión de Equipos</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {mainLinks.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}

          {/* Sección admin */}
          {isAdmin && (
            <>
              <div className="pt-4 pb-1">
                <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Sistema</p>
              </div>
              <NavLink
                to="/administracion"
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-purple-50 text-purple-700'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`
                }
              >
                <ShieldCheck size={18} />
                Administración
              </NavLink>
            </>
          )}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-slate-200 space-y-1">
          {session && (
            <div className="px-3 py-2 mb-1">
              <p className="text-xs font-medium text-slate-700">{session.nombre}</p>
              <p className="text-xs text-slate-400">{session.rol === 'admin' ? 'Administrador' : 'Viewer'}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut size={18} />
            Cerrar sesión
          </button>
          <p className="text-xs text-slate-400 px-3 pt-1">v1.0.0 · FERCO Total Look</p>
        </div>
      </aside>
    </>
  )
}
