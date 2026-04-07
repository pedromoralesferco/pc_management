import { useEffect, useState } from 'react'
import { Plus, Search, Edit2, Eye, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Equipo, TipoEquipo, EstadoEquipo } from '../types'
import { PAIS_MONEDA } from '../lib/moneda'
import Badge from '../components/Badge'
import Modal from '../components/Modal'
import { format } from 'date-fns'
import { useNavigate } from 'react-router-dom'

const estadoVariant: Record<EstadoEquipo, 'success' | 'warning' | 'danger' | 'default'> = {
  'Activo': 'success',
  'En mantenimiento': 'warning',
  'Dado de baja': 'danger',
  'En bodega': 'default',
}

const TIPOS: TipoEquipo[] = ['PC', 'Laptop', 'Monitor', 'Tablet', 'Otro']
const ESTADOS: EstadoEquipo[] = ['Activo', 'En mantenimiento', 'Dado de baja', 'En bodega']

const emptyForm = {
  correlativo_ferco: '',
  tipo: 'PC' as TipoEquipo,
  marca: '',
  modelo: '',
  numero_serie: '',
  descripcion: '',
  estado: 'Activo' as EstadoEquipo,
  pais: 'Guatemala',
  fecha_compra: '',
  garantia_hasta: '',
  proveedor: '',
  precio_compra: '',
  notas: '',
}

export default function Equipos() {
  const navigate = useNavigate()
  const [equipos, setEquipos] = useState<Equipo[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tipoFilter, setTipoFilter] = useState('')
  const [estadoFilter, setEstadoFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Equipo | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  async function fetchEquipos() {
    setLoading(true)
    const { data } = await supabase
      .from('equipos')
      .select('*')
      .order('created_at', { ascending: false })
    setEquipos(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchEquipos() }, [])

  const filtered = equipos.filter(e => {
    const q = search.toLowerCase()
    const matchSearch = !q || [e.correlativo_ferco, e.marca, e.modelo, e.numero_serie].some(v => v?.toLowerCase().includes(q))
    const matchTipo = !tipoFilter || e.tipo === tipoFilter
    const matchEstado = !estadoFilter || e.estado === estadoFilter
    return matchSearch && matchTipo && matchEstado
  })

  function openCreate() {
    setEditTarget(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  function openEdit(e: Equipo) {
    setEditTarget(e)
    setForm({
      correlativo_ferco: e.correlativo_ferco,
      tipo: e.tipo,
      marca: e.marca,
      modelo: e.modelo,
      numero_serie: e.numero_serie,
      descripcion: e.descripcion ?? '',
      estado: e.estado,
      pais: e.pais ?? 'Guatemala',
      fecha_compra: e.fecha_compra ?? '',
      garantia_hasta: e.garantia_hasta ?? '',
      proveedor: e.proveedor ?? '',
      precio_compra: e.precio_compra?.toString() ?? '',
      notas: e.notas ?? '',
    })
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.correlativo_ferco || !form.marca || !form.modelo || !form.numero_serie) return
    setSaving(true)
    const payload = {
      ...form,
      precio_compra: form.precio_compra ? parseFloat(form.precio_compra) : null,
      fecha_compra: form.fecha_compra || null,
      garantia_hasta: form.garantia_hasta || null,
      descripcion: form.descripcion || null,
      proveedor: form.proveedor || null,
      pais: form.pais || null,
      notas: form.notas || null,
    }
    if (editTarget) {
      await supabase.from('equipos').update(payload).eq('id', editTarget.id)
    } else {
      await supabase.from('equipos').insert(payload)
    }
    setSaving(false)
    setModalOpen(false)
    fetchEquipos()
  }

  async function handleDelete(id: string) {
    await supabase.from('equipos').delete().eq('id', id)
    setDeleteId(null)
    fetchEquipos()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Equipos</h1>
          <p className="text-slate-500 text-sm mt-1">{equipos.length} equipos registrados</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-primary-500 text-primary-800 px-4 py-2 rounded-lg text-sm font-bold hover:bg-primary-600 transition-colors"
        >
          <Plus size={16} /> Nuevo Equipo
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por correlativo, marca, modelo, serie..."
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <select
          value={tipoFilter}
          onChange={e => setTipoFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">Todos los tipos</option>
          {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select
          value={estadoFilter}
          onChange={e => setEstadoFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">Todos los estados</option>
          {ESTADOS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
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
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Correlativo</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Tipo</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Marca / Modelo</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">No. Serie</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Estado</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">F. Compra</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-10 text-slate-400">No se encontraron equipos</td></tr>
                )}
                {filtered.map(e => (
                  <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium text-primary-700">{e.correlativo_ferco}</td>
                    <td className="px-4 py-3 text-slate-600">{e.tipo}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{e.marca}</p>
                      <p className="text-slate-400 text-xs">{e.modelo}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600">{e.numero_serie}</td>
                    <td className="px-4 py-3">
                      <Badge label={e.estado} variant={estadoVariant[e.estado]} />
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {e.fecha_compra ? format(new Date(e.fecha_compra), 'dd/MM/yyyy') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => navigate(`/equipos/${e.id}`)}
                          className="text-slate-400 hover:text-primary-600 transition-colors"
                          title="Ver detalle"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => openEdit(e)}
                          className="text-slate-400 hover:text-primary-600 transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => setDeleteId(e.id)}
                          className="text-slate-400 hover:text-red-600 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 size={16} />
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

      {/* Modal crear/editar */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editTarget ? 'Editar Equipo' : 'Nuevo Equipo'}
        size="lg"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Correlativo FERCO *</label>
            <input
              value={form.correlativo_ferco}
              onChange={e => setForm(f => ({ ...f, correlativo_ferco: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Ej: FERCO-001"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Tipo *</label>
            <select
              value={form.tipo}
              onChange={e => setForm(f => ({ ...f, tipo: e.target.value as TipoEquipo }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Marca *</label>
            <input
              value={form.marca}
              onChange={e => setForm(f => ({ ...f, marca: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Ej: Dell, HP, Lenovo..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Modelo *</label>
            <input
              value={form.modelo}
              onChange={e => setForm(f => ({ ...f, modelo: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Ej: Latitude 5530"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Número de Serie *</label>
            <input
              value={form.numero_serie}
              onChange={e => setForm(f => ({ ...f, numero_serie: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="S/N del equipo"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Estado</label>
            <select
              value={form.estado}
              onChange={e => setForm(f => ({ ...f, estado: e.target.value as EstadoEquipo }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {ESTADOS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Fecha de Compra</label>
            <input
              type="date"
              value={form.fecha_compra}
              onChange={e => setForm(f => ({ ...f, fecha_compra: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Garantía hasta</label>
            <input
              type="date"
              value={form.garantia_hasta}
              onChange={e => setForm(f => ({ ...f, garantia_hasta: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Proveedor</label>
            <input
              value={form.proveedor}
              onChange={e => setForm(f => ({ ...f, proveedor: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Nombre del proveedor"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">País de compra</label>
            <select
              value={form.pais}
              onChange={e => setForm(f => ({ ...f, pais: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {Object.entries(PAIS_MONEDA).map(([p, { simbolo }]) => (
                <option key={p} value={p}>{p} ({simbolo})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Precio de Compra ({PAIS_MONEDA[form.pais]?.simbolo ?? 'Q'})
            </label>
            <input
              type="number"
              value={form.precio_compra}
              onChange={e => setForm(f => ({ ...f, precio_compra: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="0.00"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Descripción</label>
            <textarea
              value={form.descripcion}
              onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
              rows={2}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              placeholder="Descripción del equipo (specs, características...)"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Notas</label>
            <textarea
              value={form.notas}
              onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
              rows={2}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              placeholder="Notas adicionales..."
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={() => setModalOpen(false)}
            className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm bg-primary-500 text-primary-800 font-bold rounded-lg hover:bg-primary-600 disabled:opacity-60"
          >
            {saving ? 'Guardando...' : editTarget ? 'Actualizar' : 'Crear Equipo'}
          </button>
        </div>
      </Modal>

      {/* Modal confirmar borrado */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Confirmar eliminación" size="sm">
        <p className="text-sm text-slate-600">¿Estás seguro que deseas eliminar este equipo? Esta acción no se puede deshacer.</p>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">
            Cancelar
          </button>
          <button
            onClick={() => deleteId && handleDelete(deleteId)}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Eliminar
          </button>
        </div>
      </Modal>
    </div>
  )
}
