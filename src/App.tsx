import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Equipos from './pages/Equipos'
import EquipoDetalle from './pages/EquipoDetalle'
import Usuarios from './pages/Usuarios'
import UsuarioDetalle from './pages/UsuarioDetalle'
import Asignaciones from './pages/Asignaciones'
import Mantenimientos from './pages/Mantenimientos'
import Administracion from './pages/Administracion'
import Responsivas from './pages/Responsivas'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/equipos" element={<Equipos />} />
            <Route path="/equipos/:id" element={<EquipoDetalle />} />
            <Route path="/usuarios" element={<Usuarios />} />
            <Route path="/usuarios/:id" element={<UsuarioDetalle />} />
            <Route path="/asignaciones" element={<Asignaciones />} />
            <Route path="/mantenimientos" element={<Mantenimientos />} />
            <Route path="/responsivas" element={<Responsivas />} />
            {/* Rutas solo para admin */}
            <Route element={<AdminRoute />}>
              <Route path="/administracion" element={<Administracion />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
