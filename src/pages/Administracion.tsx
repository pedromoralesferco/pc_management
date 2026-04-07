import { useEffect, useState } from 'react'
import { Plus, Edit2, UserCheck, UserX, KeyRound, Settings } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getSession } from '../lib/auth'
import { invalidateConfig } from '../lib/config'
import Badge from '../components/Badge'
import Modal from '../components/Modal'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface AppUser {
  id: string
  username: string
  nombre: string
  rol: 'admin' | 'viewer'
  activo: boolean
  created_at: string
}

const emptyForm = {
  username: '',
  nombre: '',
  password: '',
  rol: 'viewer' as 'admin' | 'viewer',
  activo: true,
}

export default function Administracion() {
  const session = getSession()
  const [users, setUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<AppUser | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Configuración general
  const [configNombre, setConfigNombre] = useState('FERCO Total Look')
  const [savingConfig, setSavingConfig] = useState(false)
  const [configSaved, setConfigSaved] = useState(false)

  // Modal cambiar contraseña
  const [passModal, setPassModal] = useState(false)
  const [passTarget, setPassTarget] = useState<AppUser | null>(null)
  const [newPass, setNewPass] = useState('')
  const [savingPass, setSavingPass] = useState(false)

  async function fetchUsers() {
    setLoading(true)
    const { data } = await supabase
      .from('app_users')
      .select('id, username, nombre, rol, activo, created_at')
      .order('nombre')
    setUsers(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchUsers()
    supabase.from('configuracion').select('nombre_empresa').single()
      .then(({ data }) => { if (data) setConfigNombre(data.nombre_empresa) })
  }, [])

  function openCreate() {
    setEditTarget(null)
    setForm(emptyForm)
    setError('')
    setModalOpen(true)
  }

  function openEdit(u: AppUser) {
    setEditTarget(u)
    setForm({ username: u.username, nombre: u.nombre, password: '', rol: u.rol, activo: u.activo })
    setError('')
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.username || !form.nombre) return
    if (!editTarget && !form.password) { setError('La contraseña es requerida.'); return }
    setSaving(true)
    setError('')

    if (editTarget) {
      const payload: Partial<AppUser> = { nombre: form.nombre, rol: form.rol, activo: form.activo }
      const { error: err } = await supabase.from('app_users').update(payload).eq('id', editTarget.id)
      if (err) { setError('Error al actualizar.'); setSaving(false); return }
    } else {
      const { error: err } = await supabase.from('app_users').insert({
        username: form.username,
        password: form.password,
        nombre: form.nombre,
        rol: form.rol,
        activo: true,
      })
      if (err?.code === '23505') { setError('Ese nombre de usuario ya existe.'); setSaving(false); return }
      if (err) { setError('Error al crear usuario.'); setSaving(false); return }
    }

    setSaving(false)
    setModalOpen(false)
    fetchUsers()
  }

  async function toggleActivo(u: AppUser) {
    if (u.id === session?.id) return // no puede desactivarse a sí mismo
    await supabase.from('app_users').update({ activo: !u.activo }).eq('id', u.id)
    fetchUsers()
  }

  async function handleSaveConfig() {
    if (!configNombre.trim()) return
    setSavingConfig(true)
    await supabase.from('configuracion').upsert({ id: 1, nombre_empresa: configNombre.trim() })
    invalidateConfig()
    setSavingConfig(false)
    setConfigSaved(true)
    setTimeout(() => setConfigSaved(false), 3000)
  }

  async function handleChangePass() {
    if (!passTarget || !newPass) return
    setSavingPass(true)
    await supabase.from('app_users').update({ password: newPass }).eq('id', passTarget.id)
    setSavingPass(false)
    setPassModal(false)
    setNewPass('')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Administración</h1>
          <p className="text-slate-500 text-sm mt-1">Usuarios con acceso a la aplicación</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-primary-500 text-primary-800 px-4 py-2 rounded-lg text-sm font-bold hover:bg-primary-600 transition-colors"
        >
          <Plus size={16} /> Nuevo Usuario
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-medium text-slate-600">Nombre</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Usuario</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Rol</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Estado</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Creado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.length === 0 && (
                <tr><td colSpan={6} className="text-center py-10 text-slate-400">Sin usuarios</td></tr>
              )}
              {users.map(u => (
                <tr key={u.id} className={`hover:bg-slate-50 transition-colors ${u.id === session?.id ? 'bg-primary-50/40' : ''}`}>
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {u.nombre}
                    {u.id === session?.id && <span className="ml-2 text-xs text-primary-500">(tú)</span>}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-600">{u.username}</td>
                  <td className="px-4 py-3">
                    <Badge label={u.rol === 'admin' ? 'Admin' : 'Viewer'} variant={u.rol === 'admin' ? 'purple' : 'default'} />
                  </td>
                  <td className="px-4 py-3">
                    <Badge label={u.activo ? 'Activo' : 'Inactivo'} variant={u.activo ? 'success' : 'default'} />
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {format(new Date(u.created_at), 'dd MMM yyyy', { locale: es })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => openEdit(u)}
                        className="text-slate-400 hover:text-primary-600 transition-colors"
                        title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => { setPassTarget(u); setNewPass(''); setPassModal(true) }}
                        className="text-slate-400 hover:text-primary-600 transition-colors"
                        title="Cambiar contraseña"
                      >
                        <KeyRound size={16} />
                      </button>
                      {u.id !== session?.id && (
                        <button
                          onClick={() => toggleActivo(u)}
                          className={`transition-colors ${u.activo ? 'text-slate-400 hover:text-red-500' : 'text-slate-400 hover:text-green-600'}`}
                          title={u.activo ? 'Desactivar' : 'Activar'}
                        >
                          {u.activo ? <UserX size={16} /> : <UserCheck size={16} />}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal crear/editar */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editTarget ? 'Editar Usuario' : 'Nuevo Usuario'}
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Nombre completo *</label>
            <input
              value={form.nombre}
              onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Nombre del usuario"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Usuario *</label>
            <input
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              disabled={!!editTarget}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-slate-50 font-mono"
              placeholder="nombre.usuario"
            />
          </div>
          {!editTarget && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Contraseña *</label>
              <input
                type="text"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Contraseña inicial"
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Rol</label>
            <select
              value={form.rol}
              onChange={e => setForm(f => ({ ...f, rol: e.target.value as 'admin' | 'viewer' }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="viewer">Viewer — solo lectura</option>
              <option value="admin">Admin — acceso total</option>
            </select>
          </div>
          {editTarget && (
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={form.activo}
                onChange={e => setForm(f => ({ ...f, activo: e.target.checked }))}
                className="rounded"
              />
              Usuario activo
            </label>
          )}
          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm bg-primary-500 text-primary-800 font-bold rounded-lg hover:bg-primary-600 disabled:opacity-60"
          >
            {saving ? 'Guardando...' : editTarget ? 'Actualizar' : 'Crear Usuario'}
          </button>
        </div>
      </Modal>

      {/* Configuración general */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
          <Settings size={16} className="text-slate-500" />
          <h2 className="font-semibold text-slate-800">Configuración General</h2>
        </div>
        <div className="p-6 space-y-4 max-w-md">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Nombre de la empresa
              <span className="text-slate-400 font-normal ml-1">(aparece en el encabezado de las responsivas)</span>
            </label>
            <input
              value={configNombre}
              onChange={e => setConfigNombre(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Ej: FERCO Total Look"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveConfig}
              disabled={savingConfig || !configNombre.trim()}
              className="px-4 py-2 text-sm bg-primary-500 text-primary-800 font-bold rounded-lg hover:bg-primary-600 disabled:opacity-60"
            >
              {savingConfig ? 'Guardando...' : 'Guardar'}
            </button>
            {configSaved && (
              <span className="text-sm text-green-600 font-medium">✓ Guardado</span>
            )}
          </div>
        </div>
      </div>

      {/* Modal cambiar contraseña */}
      <Modal open={passModal} onClose={() => setPassModal(false)} title="Cambiar Contraseña" size="sm">
        <p className="text-sm text-slate-500 mb-4">
          Cambiando contraseña de <span className="font-medium text-slate-700">{passTarget?.nombre}</span>
        </p>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Nueva contraseña</label>
          <input
            type="text"
            value={newPass}
            onChange={e => setNewPass(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Nueva contraseña"
          />
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setPassModal(false)} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">
            Cancelar
          </button>
          <button
            onClick={handleChangePass}
            disabled={savingPass || !newPass}
            className="px-4 py-2 text-sm bg-primary-500 text-primary-800 font-bold rounded-lg hover:bg-primary-600 disabled:opacity-60"
          >
            {savingPass ? 'Guardando...' : 'Cambiar'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
