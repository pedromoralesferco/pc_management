import { useEffect, useState } from 'react'
import { Plus, Search, Edit2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Mantenimiento, Equipo, TipoMantenimiento, EstadoMantenimiento } from '../types'
import Badge from '../components/Badge'
import Modal from '../components/Modal'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const TIPOS: TipoMantenimiento[] = ['Preventivo', 'Correctivo', 'Reparacion']
const ESTADOS: EstadoMantenimiento[] = ['Pendiente', 'En progreso', 'Completado', 'Cancelado']

const estadoVariant: Record<EstadoMantenimiento, 'warning' | 'info' | 'success' | 'danger'> = {
  'Pendiente': 'warning',
  'En progreso': 'info',
  'Completado': 'success',
  'Cancelado': 'danger',
}

const emptyForm = {
  equipo_id: '',
  tipo: 'Preventivo' as TipoMantenimiento,
  descripcion: '',
  fecha_inicio: new Date().toISOString().split('T')[0],
  fecha_fin: '',
  proveedor_servicio: '',
  costo: '',
  realizado_por: '',
  estado: 'Pendiente' as EstadoMantenimiento,
  resultado: '',
  notas: '',
}

export default function Mantenimientos() {
  const [mantenimientos, setMantenimientos] = useState<Mantenimiento[]>([])
  const [equipos, setEquipos] = useState<Equipo[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tipoFilter, setTipoFilter] = useState('')
  const [estadoFilter, setEstadoFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Mantenimiento | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  async function fetchAll() {
    setLoading(true)
    const [{ data: mant }, { data: eq }] = await Promise.all([
      supabase.from('mantenimientos')
        .select('*, equipo:equipos(correlativo_ferco, marca, modelo, tipo)')
        .order('fecha_inicio', { ascending: false }),
      supabase.from('equipos').select('id, correlativo_ferco, marca, modelo').order('correlativo_ferco'),
    ])
    setMantenimientos((mant as Mantenimiento[]) ?? [])
    setEquipos((eq as Equipo[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  const filtered = mantenimientos.filter(m => {
    const q = search.toLowerCase()
    const matchSearch = !q || [
      m.equipo?.correlativo_ferco ?? '',
      m.equipo?.marca ?? '',
      m.equipo?.modelo ?? '',
      m.descripcion,
      m.proveedor_servicio ?? '',
    ].some(v => v.toLowerCase().includes(q))
    const matchTipo = !tipoFilter || m.tipo === tipoFilter
    const matchEstado = !estadoFilter || m.estado === estadoFilter
    return matchSearch && matchTipo && matchEstado
  })

  function openCreate() {
    setEditTarget(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  function openEdit(m: Mantenimiento) {
    setEditTarget(m)
    setForm({
      equipo_id: m.equipo_id,
      tipo: m.tipo,
      descripcion: m.descripcion,
      fecha_inicio: m.fecha_inicio,
      fecha_fin: m.fecha_fin ?? '',
      proveedor_servicio: m.proveedor_servicio ?? '',
      costo: m.costo?.toString() ?? '',
      realizado_por: m.realizado_por ?? '',
      estado: m.estado,
      resultado: m.resultado ?? '',
      notas: m.notas ?? '',
    })
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.equipo_id || !form.descripcion || !form.fecha_inicio) return
    setSaving(true)
    const payload = {
      equipo_id: form.equipo_id,
      tipo: form.tipo,
      descripcion: form.descripcion,
      fecha_inicio: form.fecha_inicio,
      fecha_fin: form.fecha_fin || null,
      proveedor_servicio: form.proveedor_servicio || null,
      costo: form.costo ? parseFloat(form.costo) : null,
      realizado_por: form.realizado_por || null,
      estado: form.estado,
      resultado: form.resultado || null,
      notas: form.notas || null,
    }
    if (editTarget) {
      await supabase.from('mantenimientos').update(payload).eq('id', editTarget.id)
    } else {
      await supabase.from('mantenimientos').insert(payload)
    }
    setSaving(false)
    setModalOpen(false)
    fetchAll()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Mantenimientos</h1>
          <p className="text-slate-500 text-sm mt-1">
            {mantenimientos.filter(m => ['Pendiente', 'En progreso'].includes(m.estado)).length} pendientes · {mantenimientos.length} total
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-primary-500 text-primary-800 px-4 py-2 rounded-lg text-sm font-bold hover:bg-primary-600 transition-colors"
        >
          <Plus size={16} /> Nuevo Mantenimiento
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por equipo, descripción, proveedor..."
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
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Equipo</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Tipo</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Descripción</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Proveedor</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Costo</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">F. Inicio</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Estado</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-10 text-slate-400">No se encontraron mantenimientos</td></tr>
                )}
                {filtered.map(m => (
                  <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{m.equipo?.marca} {m.equipo?.modelo}</p>
                      <p className="text-xs text-slate-400 font-mono">{m.equipo?.correlativo_ferco}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{m.tipo}</td>
                    <td className="px-4 py-3 text-slate-600 max-w-xs">
                      <p className="truncate">{m.descripcion}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{m.proveedor_servicio ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {m.costo ? `Q ${m.costo.toLocaleString()}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {format(new Date(m.fecha_inicio), 'dd MMM yyyy', { locale: es })}
                    </td>
                    <td className="px-4 py-3">
                      <Badge label={m.estado} variant={estadoVariant[m.estado]} />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openEdit(m)}
                        className="text-slate-400 hover:text-primary-600 transition-colors"
                        title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
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
        title={editTarget ? 'Editar Mantenimiento' : 'Nuevo Mantenimiento'}
        size="lg"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Equipo *</label>
            <select
              value={form.equipo_id}
              onChange={e => setForm(f => ({ ...f, equipo_id: e.target.value }))}
              disabled={!!editTarget}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-slate-50"
            >
              <option value="">Selecciona un equipo...</option>
              {equipos.map(e => (
                <option key={e.id} value={e.id}>{e.correlativo_ferco} — {e.marca} {e.modelo}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Tipo *</label>
            <select
              value={form.tipo}
              onChange={e => setForm(f => ({ ...f, tipo: e.target.value as TipoMantenimiento }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Estado</label>
            <select
              value={form.estado}
              onChange={e => setForm(f => ({ ...f, estado: e.target.value as EstadoMantenimiento }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {ESTADOS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Descripción *</label>
            <textarea
              value={form.descripcion}
              onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
              rows={2}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              placeholder="Describe el mantenimiento o reparación..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Fecha de Inicio *</label>
            <input type="date" value={form.fecha_inicio} onChange={e => setForm(f => ({ ...f, fecha_inicio: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Fecha de Fin</label>
            <input type="date" value={form.fecha_fin} onChange={e => setForm(f => ({ ...f, fecha_fin: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Proveedor de Servicio</label>
            <input value={form.proveedor_servicio} onChange={e => setForm(f => ({ ...f, proveedor_servicio: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Nombre del taller o técnico" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Costo (Q)</label>
            <input type="number" value={form.costo} onChange={e => setForm(f => ({ ...f, costo: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="0.00" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Realizado por</label>
            <input value={form.realizado_por} onChange={e => setForm(f => ({ ...f, realizado_por: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Técnico o responsable" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Resultado</label>
            <input value={form.resultado} onChange={e => setForm(f => ({ ...f, resultado: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Resultado del mantenimiento" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Notas</label>
            <textarea value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
              rows={2}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              placeholder="Notas adicionales..." />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm bg-primary-500 text-primary-800 font-bold rounded-lg hover:bg-primary-600 disabled:opacity-60">
            {saving ? 'Guardando...' : editTarget ? 'Actualizar' : 'Registrar Mantenimiento'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
