import { useEffect, useState } from 'react'
import { Plus, Search, RotateCcw, FileText } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getSession } from '../lib/auth'
import type { Asignacion, Equipo, Usuario } from '../types'
import Badge from '../components/Badge'
import Modal from '../components/Modal'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const makeEmptyForm = () => ({
  equipo_id: '',
  usuario_id: '',
  fecha_asignacion: new Date().toISOString().split('T')[0],
  motivo: '',
  asignado_por: getSession()?.nombre ?? '',
  notas: '',
})

export default function Asignaciones() {
  const navigate = useNavigate()
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([])
  const [equipos, setEquipos] = useState<Equipo[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [soloActivas, setSoloActivas] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [devolucionId, setDevolucionId] = useState<string | null>(null)
  const [fechaDevolucion, setFechaDevolucion] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(makeEmptyForm)

  function handleGenerarResponsiva(a: Asignacion) {
    navigate(`/usuarios/${a.usuario_id}`)
  }

  async function fetchAll() {
    setLoading(true)
    const [{ data: asig }, { data: eq }, { data: us }, { data: asigActivas }] = await Promise.all([
      supabase.from('asignaciones')
        .select('*, equipo:equipos(correlativo_ferco, marca, modelo, tipo, numero_serie, precio_compra), usuario:usuarios(nombre, apellido, email, centro_costo, pais, cargo)')
        .order('fecha_asignacion', { ascending: false }),
      supabase.from('equipos').select('id, correlativo_ferco, marca, modelo, tipo, estado').eq('estado', 'Activo').order('correlativo_ferco'),
      supabase.from('usuarios').select('id, nombre, apellido, email, centro_costo, pais').eq('activo', true).order('nombre'),
      supabase.from('asignaciones').select('equipo_id').is('fecha_devolucion', null),
    ])
    setAsignaciones((asig as Asignacion[]) ?? [])
    // Only show equipos that are active AND not currently assigned
    const asignadasIds = new Set((asigActivas ?? []).map((a: any) => a.equipo_id))
    setEquipos(((eq as Equipo[]) ?? []).filter(e => !asignadasIds.has(e.id)))
    setUsuarios((us as Usuario[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  const filtered = asignaciones.filter(a => {
    const q = search.toLowerCase()
    const matchSearch = !q || [
      a.equipo?.correlativo_ferco ?? '',
      a.equipo?.marca ?? '',
      a.equipo?.modelo ?? '',
      a.usuario?.nombre ?? '',
      a.usuario?.apellido ?? '',
      a.usuario?.email ?? '',
    ].some(v => v.toLowerCase().includes(q))
    const matchActiva = !soloActivas || !a.fecha_devolucion
    return matchSearch && matchActiva
  })

  async function resetFirmadaUsuario(usuario_id: string) {
    // La responsiva más reciente del usuario deja de ser válida cuando cambia su set de equipos
    const { data } = await supabase
      .from('responsivas')
      .select('id')
      .eq('usuario_id', usuario_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    if (data?.id) {
      await supabase.from('responsivas').update({ firmada: false }).eq('id', data.id)
    }
  }

  async function handleSave() {
    if (!form.equipo_id || !form.usuario_id || !form.fecha_asignacion) return
    setSaving(true)
    await supabase.from('asignaciones').insert({
      equipo_id: form.equipo_id,
      usuario_id: form.usuario_id,
      fecha_asignacion: form.fecha_asignacion,
      motivo: form.motivo || null,
      asignado_por: form.asignado_por || null,
      notas: form.notas || null,
    })
    await resetFirmadaUsuario(form.usuario_id)
    setSaving(false)
    setModalOpen(false)
    setForm(makeEmptyForm())
    fetchAll()
  }

  async function handleDevolucion() {
    if (!devolucionId) return
    const asig = asignaciones.find(a => a.id === devolucionId)
    await supabase.from('asignaciones').update({ fecha_devolucion: fechaDevolucion }).eq('id', devolucionId)
    if (asig?.usuario_id) await resetFirmadaUsuario(asig.usuario_id)
    setDevolucionId(null)
    fetchAll()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Asignaciones</h1>
          <p className="text-slate-500 text-sm mt-1">
            {asignaciones.filter(a => !a.fecha_devolucion).length} activas · {asignaciones.length} total
          </p>
        </div>
        <button
          onClick={() => { setForm(makeEmptyForm()); setModalOpen(true) }}
          className="flex items-center gap-2 bg-primary-500 text-primary-800 px-4 py-2 rounded-lg text-sm font-bold hover:bg-primary-600 transition-colors"
        >
          <Plus size={16} /> Nueva Asignación
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por equipo, usuario, email..."
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
          <input type="checkbox" checked={soloActivas} onChange={e => setSoloActivas(e.target.checked)} className="rounded" />
          Solo activas
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
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Equipo</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Usuario</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Centro de Costo</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">F. Asignación</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">F. Devolución</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Estado</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-10 text-slate-400">No se encontraron asignaciones</td></tr>
                )}
                {filtered.map(a => (
                  <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{a.equipo?.marca} {a.equipo?.modelo}</p>
                      <p className="text-xs text-slate-400 font-mono">{a.equipo?.correlativo_ferco}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{a.usuario?.nombre} {a.usuario?.apellido}</p>
                      <p className="text-xs text-slate-400">{a.usuario?.email}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{a.usuario?.centro_costo}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {format(new Date(a.fecha_asignacion), 'dd MMM yyyy', { locale: es })}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {a.fecha_devolucion ? format(new Date(a.fecha_devolucion), 'dd MMM yyyy', { locale: es }) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge label={a.fecha_devolucion ? 'Devuelto' : 'Activo'} variant={a.fecha_devolucion ? 'default' : 'success'} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {!a.fecha_devolucion && (
                          <>
                            <button
                              onClick={() => { setDevolucionId(a.id); setFechaDevolucion(new Date().toISOString().split('T')[0]) }}
                              className="flex items-center gap-1 text-xs text-slate-400 hover:text-primary-600 transition-colors"
                              title="Registrar devolución"
                            >
                              <RotateCcw size={14} /> Devolver
                            </button>
                            <button
                              onClick={() => handleGenerarResponsiva(a)}
                              className="flex items-center gap-1 text-xs text-slate-400 hover:text-green-600 transition-colors"
                              title="Generar responsiva"
                            >
                              <FileText size={14} /> Responsiva
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal nueva asignación */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nueva Asignación" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Equipo *</label>
            <select
              value={form.equipo_id}
              onChange={e => setForm(f => ({ ...f, equipo_id: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Selecciona un equipo...</option>
              {equipos.map(e => (
                <option key={e.id} value={e.id}>{e.correlativo_ferco} — {e.marca} {e.modelo} ({e.tipo})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Usuario *</label>
            <select
              value={form.usuario_id}
              onChange={e => setForm(f => ({ ...f, usuario_id: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Selecciona un usuario...</option>
              {usuarios.map(u => (
                <option key={u.id} value={u.id}>{u.nombre} {u.apellido} — {u.email}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Fecha de Asignación *</label>
            <input
              type="date"
              value={form.fecha_asignacion}
              onChange={e => setForm(f => ({ ...f, fecha_asignacion: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Motivo</label>
            <input
              value={form.motivo}
              onChange={e => setForm(f => ({ ...f, motivo: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Ej: Empleado nuevo, reemplazo..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Asignado por</label>
            <input
              value={form.asignado_por}
              readOnly
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-500 cursor-default"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Notas</label>
            <textarea
              value={form.notas}
              onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
              rows={2}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm bg-primary-500 text-primary-800 font-bold rounded-lg hover:bg-primary-600 disabled:opacity-60">
            {saving ? 'Guardando...' : 'Registrar Asignación'}
          </button>
        </div>
      </Modal>

      {/* Modal devolución */}
      <Modal open={!!devolucionId} onClose={() => setDevolucionId(null)} title="Registrar Devolución" size="sm">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Fecha de Devolución</label>
          <input
            type="date"
            value={fechaDevolucion}
            onChange={e => setFechaDevolucion(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setDevolucionId(null)} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">Cancelar</button>
          <button onClick={handleDevolucion} className="px-4 py-2 text-sm bg-primary-500 text-primary-800 font-bold rounded-lg hover:bg-primary-600">
            Confirmar Devolución
          </button>
        </div>
      </Modal>
    </div>
  )
}
