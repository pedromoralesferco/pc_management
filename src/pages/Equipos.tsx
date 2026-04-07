import { useEffect, useState } from 'react'
import { Plus, Search, Edit2, Eye, Trash2, PowerOff, User, Package } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Equipo, TipoEquipo, EstadoEquipo } from '../types'
import { PAIS_MONEDA, PAISES } from '../lib/moneda'
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

type UsuarioAsig = { id: string; nombre: string; apellido: string }
type EquipoConUsuario = Equipo & { _usuario?: UsuarioAsig }

type Grupo = {
  tipo: 'libre' | 'usuario'
  usuario?: UsuarioAsig
  equipos: EquipoConUsuario[]
}

export default function Equipos() {
  const navigate = useNavigate()
  const [equipos, setEquipos] = useState<EquipoConUsuario[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tipoFilter, setTipoFilter] = useState('')
  const [estadoFilter, setEstadoFilter] = useState('')
  const [paisFilter, setPaisFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Equipo | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [bajaId, setBajaId] = useState<string | null>(null)

  async function fetchEquipos() {
    setLoading(true)
    const [{ data: eq }, { data: asigActivas }] = await Promise.all([
      supabase.from('equipos').select('*').order('correlativo_ferco'),
      supabase.from('asignaciones')
        .select('equipo_id, usuario_id, usuario:usuarios(id, nombre, apellido)')
        .is('fecha_devolucion', null),
    ])

    const asigMap: Record<string, UsuarioAsig> = {}
    ;(asigActivas ?? []).forEach((a: any) => {
      if (a.usuario) asigMap[a.equipo_id] = a.usuario
    })

    const merged: EquipoConUsuario[] = (eq ?? []).map((e: Equipo) => ({
      ...e,
      _usuario: asigMap[e.id],
    }))

    setEquipos(merged)
    setLoading(false)
  }

  useEffect(() => { fetchEquipos() }, [])

  const filtered = equipos.filter(e => {
    const q = search.toLowerCase()
    const matchSearch = !q || [e.correlativo_ferco, e.marca, e.modelo, e.numero_serie].some(v => v?.toLowerCase().includes(q))
    const matchTipo = !tipoFilter || e.tipo === tipoFilter
    const matchEstado = !estadoFilter || e.estado === estadoFilter
    const matchPais = !paisFilter || e.pais === paisFilter
    return matchSearch && matchTipo && matchEstado && matchPais
  })

  // Build groups: "Sin asignación" first, then one group per user
  const grupos: Grupo[] = (() => {
    const libres: EquipoConUsuario[] = []
    const porUsuario: Record<string, { usuario: UsuarioAsig; equipos: EquipoConUsuario[] }> = {}

    filtered.forEach(e => {
      if (!e._usuario) {
        libres.push(e)
      } else {
        const uid = e._usuario.id
        if (!porUsuario[uid]) porUsuario[uid] = { usuario: e._usuario, equipos: [] }
        porUsuario[uid].equipos.push(e)
      }
    })

    const result: Grupo[] = []
    if (libres.length > 0) result.push({ tipo: 'libre', equipos: libres })
    Object.values(porUsuario)
      .sort((a, b) => a.usuario.nombre.localeCompare(b.usuario.nombre))
      .forEach(g => result.push({ tipo: 'usuario', usuario: g.usuario, equipos: g.equipos }))
    return result
  })()

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

  async function handleDarDeBaja(id: string) {
    await supabase.from('equipos').update({ estado: 'Dado de baja' }).eq('id', id)
    setBajaId(null)
    fetchEquipos()
  }

  function EquipoRow({ e }: { e: EquipoConUsuario }) {
    return (
      <div className="px-4 py-3 flex items-center gap-3 text-sm hover:bg-slate-50 transition-colors">
        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
          <Package size={14} className="text-slate-500" />
        </div>
        <div className="font-mono text-primary-700 font-medium w-28 flex-shrink-0">{e.correlativo_ferco}</div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-slate-800 truncate">{e.marca} {e.modelo}</p>
          <p className="text-xs text-slate-400">{e.tipo} · {e.numero_serie}</p>
        </div>
        <div className="hidden md:block text-slate-500 text-xs w-20">{e.pais ?? '—'}</div>
        <div className="w-28 flex-shrink-0">
          <Badge label={e.estado} variant={estadoVariant[e.estado]} />
        </div>
        <div className="hidden md:block text-slate-400 text-xs w-20">
          {e.fecha_compra ? format(new Date(e.fecha_compra), 'dd/MM/yyyy') : '—'}
        </div>
        <div className="flex items-center gap-1 justify-end flex-shrink-0">
          <button
            onClick={() => navigate(`/equipos/${e.id}`)}
            className="p-1.5 text-slate-400 hover:text-primary-600 transition-colors"
            title="Ver detalle"
          >
            <Eye size={14} />
          </button>
          <button
            onClick={() => openEdit(e)}
            className="p-1.5 text-slate-400 hover:text-primary-600 transition-colors"
            title="Editar"
          >
            <Edit2 size={14} />
          </button>
          {e.estado !== 'Dado de baja' && (
            <button
              onClick={() => setBajaId(e.id)}
              className="p-1.5 text-slate-400 hover:text-amber-600 transition-colors"
              title="Dar de baja"
            >
              <PowerOff size={14} />
            </button>
          )}
          <button
            onClick={() => setDeleteId(e.id)}
            className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
            title="Eliminar"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    )
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
        <select
          value={paisFilter}
          onChange={e => setPaisFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">Todos los países</option>
          {PAISES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* Grupos */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-6 h-6 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : grupos.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400 text-sm">
          No se encontraron equipos
        </div>
      ) : (
        <div className="space-y-4">
          {grupos.map((grupo, gi) => (
            <div key={gi} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              {/* Group header */}
              <div className={`flex items-center gap-2 px-4 py-3 border-b border-slate-100 ${
                grupo.tipo === 'libre' ? 'bg-slate-50' : 'bg-primary-50/50'
              }`}>
                {grupo.tipo === 'libre' ? (
                  <Package size={15} className="text-slate-500" />
                ) : (
                  <User size={15} className="text-primary-600" />
                )}
                <span className={`font-semibold text-sm ${
                  grupo.tipo === 'libre' ? 'text-slate-600' : 'text-primary-700'
                }`}>
                  {grupo.tipo === 'libre'
                    ? 'Sin Asignación'
                    : `${grupo.usuario!.nombre} ${grupo.usuario!.apellido}`}
                </span>
                <span className="text-xs text-slate-400 font-normal ml-1">
                  ({grupo.equipos.length} equipo{grupo.equipos.length !== 1 ? 's' : ''})
                </span>
              </div>
              {/* Column headers */}
              <div className="px-4 py-2 flex items-center gap-3 text-xs font-medium text-slate-400 border-b border-slate-100 bg-white">
                <div className="w-8 flex-shrink-0" />
                <div className="w-28 flex-shrink-0">Correlativo</div>
                <div className="flex-1">Equipo</div>
                <div className="hidden md:block w-20">País</div>
                <div className="w-28 flex-shrink-0">Estado</div>
                <div className="hidden md:block w-20">F. Compra</div>
                <div className="w-24 flex-shrink-0" />
              </div>
              {/* Rows */}
              <div className="divide-y divide-slate-100">
                {grupo.equipos.map(e => <EquipoRow key={e.id} e={e} />)}
              </div>
            </div>
          ))}
        </div>
      )}

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

      {/* Modal dar de baja */}
      <Modal open={!!bajaId} onClose={() => setBajaId(null)} title="Dar de baja equipo" size="sm">
        <p className="text-sm text-slate-600">El equipo pasará al estado <span className="font-medium text-amber-700">Dado de baja</span>. Puedes revertirlo desde editar.</p>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setBajaId(null)} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">
            Cancelar
          </button>
          <button
            onClick={() => bajaId && handleDarDeBaja(bajaId)}
            className="px-4 py-2 text-sm bg-amber-500 text-white font-bold rounded-lg hover:bg-amber-600"
          >
            Dar de baja
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
