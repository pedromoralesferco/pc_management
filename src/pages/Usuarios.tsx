import { useEffect, useState } from 'react'
import { Plus, Search, Edit2, Eye, UserCheck, UserX } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Usuario } from '../types'
import Badge from '../components/Badge'
import Modal from '../components/Modal'
import { useNavigate } from 'react-router-dom'

const PAISES = ['Guatemala', 'México', 'El Salvador', 'Honduras', 'Costa Rica', 'Panamá', 'Colombia', 'Otro']

const emptyForm = {
  email: '',
  nombre: '',
  apellido: '',
  centro_costo: '',
  pais: 'Guatemala',
  departamento: '',
  cargo: '',
  activo: true,
}

export default function Usuarios() {
  const navigate = useNavigate()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [soloActivos, setSoloActivos] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Usuario | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  async function fetchUsuarios() {
    setLoading(true)
    const { data } = await supabase
      .from('usuarios')
      .select('*')
      .order('nombre')
    setUsuarios(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchUsuarios() }, [])

  const filtered = usuarios.filter(u => {
    const q = search.toLowerCase()
    const matchSearch = !q || [u.email, u.nombre, u.apellido, u.centro_costo, u.departamento ?? '', u.cargo ?? ''].some(v => v.toLowerCase().includes(q))
    const matchActivo = !soloActivos || u.activo
    return matchSearch && matchActivo
  })

  function openCreate() {
    setEditTarget(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  function openEdit(u: Usuario) {
    setEditTarget(u)
    setForm({
      email: u.email,
      nombre: u.nombre,
      apellido: u.apellido,
      centro_costo: u.centro_costo,
      pais: u.pais,
      departamento: u.departamento ?? '',
      cargo: u.cargo ?? '',
      activo: u.activo,
    })
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.email || !form.nombre || !form.apellido || !form.centro_costo) return
    setSaving(true)
    const payload = {
      ...form,
      departamento: form.departamento || null,
      cargo: form.cargo || null,
    }
    if (editTarget) {
      await supabase.from('usuarios').update(payload).eq('id', editTarget.id)
    } else {
      await supabase.from('usuarios').insert(payload)
    }
    setSaving(false)
    setModalOpen(false)
    fetchUsuarios()
  }

  async function toggleActivo(u: Usuario) {
    await supabase.from('usuarios').update({ activo: !u.activo }).eq('id', u.id)
    fetchUsuarios()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Usuarios</h1>
          <p className="text-slate-500 text-sm mt-1">{usuarios.filter(u => u.activo).length} usuarios activos</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-primary-500 text-primary-800 px-4 py-2 rounded-lg text-sm font-bold hover:bg-primary-600 transition-colors"
        >
          <Plus size={16} /> Nuevo Usuario
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre, email, departamento..."
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
          <input
            type="checkbox"
            checked={soloActivos}
            onChange={e => setSoloActivos(e.target.checked)}
            className="rounded"
          />
          Solo activos
        </label>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Nombre</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Centro de Costo</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">País</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Departamento</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Estado</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-10 text-slate-400">No se encontraron usuarios</td></tr>
                )}
                {filtered.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{u.nombre} {u.apellido}</p>
                      {u.cargo && <p className="text-xs text-slate-400">{u.cargo}</p>}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{u.email}</td>
                    <td className="px-4 py-3 text-slate-600">{u.centro_costo}</td>
                    <td className="px-4 py-3 text-slate-600">{u.pais}</td>
                    <td className="px-4 py-3 text-slate-500">{u.departamento ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Badge label={u.activo ? 'Activo' : 'Inactivo'} variant={u.activo ? 'success' : 'default'} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => navigate(`/usuarios/${u.id}`)}
                          className="text-slate-400 hover:text-primary-600 transition-colors"
                          title="Ver detalle"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => openEdit(u)}
                          className="text-slate-400 hover:text-primary-600 transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => toggleActivo(u)}
                          className={`transition-colors ${u.activo ? 'text-slate-400 hover:text-red-500' : 'text-slate-400 hover:text-green-600'}`}
                          title={u.activo ? 'Desactivar' : 'Activar'}
                        >
                          {u.activo ? <UserX size={16} /> : <UserCheck size={16} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editTarget ? 'Editar Usuario' : 'Nuevo Usuario'}
        size="md"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Correo Electrónico *</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              disabled={!!editTarget}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-slate-50"
              placeholder="usuario@empresa.com"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Nombre *</label>
            <input
              value={form.nombre}
              onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Apellido *</label>
            <input
              value={form.apellido}
              onChange={e => setForm(f => ({ ...f, apellido: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Centro de Costo *</label>
            <input
              value={form.centro_costo}
              onChange={e => setForm(f => ({ ...f, centro_costo: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Ej: TI, RRHH, Ventas..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">País *</label>
            <select
              value={form.pais}
              onChange={e => setForm(f => ({ ...f, pais: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {PAISES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Departamento</label>
            <input
              value={form.departamento}
              onChange={e => setForm(f => ({ ...f, departamento: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Ej: Sistemas, Contabilidad..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Cargo</label>
            <input
              value={form.cargo}
              onChange={e => setForm(f => ({ ...f, cargo: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Ej: Analista, Gerente..."
            />
          </div>
          {editTarget && (
            <div className="sm:col-span-2">
              <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.activo}
                  onChange={e => setForm(f => ({ ...f, activo: e.target.checked }))}
                  className="rounded"
                />
                Usuario activo
              </label>
            </div>
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
    </div>
  )
}
