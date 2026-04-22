import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, User, Wrench, Calendar, Edit2, UserPlus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getSession } from '../lib/auth'
import type { Equipo, Asignacion, Mantenimiento, TipoEquipo, EstadoEquipo } from '../types'
import { formatMoneda, PAIS_MONEDA } from '../lib/moneda'
import Badge from '../components/Badge'
import Modal from '../components/Modal'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const parseDate = (d: string) => new Date(d + 'T00:00:00')

const estadoVariant: Record<string, 'success' | 'warning' | 'danger' | 'default' | 'info'> = {
  'Activo': 'success',
  'En mantenimiento': 'warning',
  'Dado de baja': 'danger',
  'En bodega': 'default',
  'Préstamo': 'info',
}

const TIPOS: TipoEquipo[] = ['PC', 'Laptop', 'Monitor', 'Tablet', 'Otro']
const ESTADOS: EstadoEquipo[] = ['Activo', 'En mantenimiento', 'Dado de baja', 'En bodega', 'Préstamo']

const PAISES_USUARIO = ['Guatemala', 'México', 'El Salvador', 'Honduras', 'Costa Rica', 'Panamá', 'Colombia', 'Otro']
const nuevoUsuarioEmpty = () => ({ nombre: '', apellido: '', email: '', pais: 'Guatemala', centro_costo: '', departamento: '', cargo: '' })
const makeAsignarForm = () => ({ usuario_id: '', fecha_asignacion: new Date().toISOString().split('T')[0], motivo: '' })

type UsuarioSimple = { id: string; nombre: string; apellido: string; email: string }

const emptyEditForm = (e: Equipo) => ({
  correlativo_ferco: e.correlativo_ferco,
  tipo: e.tipo,
  marca: e.marca,
  modelo: e.modelo,
  numero_serie: e.numero_serie,
  procesador: e.procesador ?? '',
  ram: e.ram ?? '',
  almacenamiento: e.almacenamiento ?? '',
  descripcion: e.descripcion ?? '',
  estado: e.estado,
  pais: e.pais ?? 'Guatemala',
  fecha_compra: e.fecha_compra ?? '',
  garantia_hasta: e.garantia_hasta ?? '',
  proveedor: e.proveedor ?? '',
  precio_compra: e.precio_compra?.toString() ?? '',
  notas: e.notas ?? '',
})

export default function EquipoDetalle() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [equipo, setEquipo] = useState<Equipo | null>(null)
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([])
  const [mantenimientos, setMantenimientos] = useState<Mantenimiento[]>([])
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState<ReturnType<typeof emptyEditForm> | null>(null)
  const [editSaving, setEditSaving] = useState(false)
  const [asignarOpen, setAsignarOpen] = useState(false)
  const [asignarForm, setAsignarForm] = useState(makeAsignarForm)
  const [asignarUsuarios, setAsignarUsuarios] = useState<UsuarioSimple[]>([])
  const [asignarSaving, setAsignarSaving] = useState(false)
  const [creandoUsuario, setCreandoUsuario] = useState(false)
  const [nuevoUsuarioForm, setNuevoUsuarioForm] = useState(nuevoUsuarioEmpty)
  const [creandoUsuarioSaving, setCreandoUsuarioSaving] = useState(false)

  useEffect(() => {
    async function fetch() {
      const [{ data: eq }, { data: asig }, { data: mant }] = await Promise.all([
        supabase.from('equipos').select('*').eq('id', id!).single(),
        supabase.from('asignaciones')
          .select('*, usuario:usuarios(nombre, apellido, email, centro_costo, pais)')
          .eq('equipo_id', id!)
          .order('fecha_asignacion', { ascending: false }),
        supabase.from('mantenimientos')
          .select('*')
          .eq('equipo_id', id!)
          .order('fecha_inicio', { ascending: false }),
      ])
      setEquipo(eq)
      setAsignaciones((asig as Asignacion[]) ?? [])
      setMantenimientos((mant as Mantenimiento[]) ?? [])
      setLoading(false)
    }
    fetch()
  }, [id])

  async function openAsignar() {
    setAsignarForm(makeAsignarForm())
    setCreandoUsuario(false)
    setNuevoUsuarioForm(nuevoUsuarioEmpty())
    const { data } = await supabase.from('usuarios').select('id, nombre, apellido, email').eq('activo', true).order('nombre')
    setAsignarUsuarios((data as UsuarioSimple[]) ?? [])
    setAsignarOpen(true)
  }

  async function handleAsignar() {
    if (!asignarForm.usuario_id || !equipo) return
    setAsignarSaving(true)
    await supabase.from('asignaciones').insert({
      equipo_id: equipo.id,
      usuario_id: asignarForm.usuario_id,
      fecha_asignacion: asignarForm.fecha_asignacion,
      motivo: asignarForm.motivo || null,
      asignado_por: getSession()?.nombre ?? null,
    })
    const { data: lastR } = await supabase.from('responsivas').select('id')
      .eq('usuario_id', asignarForm.usuario_id).order('created_at', { ascending: false }).limit(1).single()
    if (lastR?.id) await supabase.from('responsivas').update({ firmada: false }).eq('id', lastR.id)
    setAsignarSaving(false)
    setAsignarOpen(false)
    // Refetch asignaciones para actualizar la vista
    const { data: asig } = await supabase.from('asignaciones')
      .select('*, usuario:usuarios(nombre, apellido, email, centro_costo, pais)')
      .eq('equipo_id', equipo.id).order('fecha_asignacion', { ascending: false })
    setAsignaciones((asig as Asignacion[]) ?? [])
  }

  async function handleCrearUsuarioEnAsignar() {
    const { nombre, apellido, email, centro_costo } = nuevoUsuarioForm
    if (!nombre || !apellido || !email || !centro_costo) return
    setCreandoUsuarioSaving(true)
    const { data } = await supabase.from('usuarios').insert({
      ...nuevoUsuarioForm,
      departamento: nuevoUsuarioForm.departamento || null,
      cargo: nuevoUsuarioForm.cargo || null,
      activo: true,
    }).select('id, nombre, apellido, email').single()
    if (data) {
      setAsignarUsuarios(prev => [...prev, data as UsuarioSimple].sort((a, b) => a.nombre.localeCompare(b.nombre)))
      setAsignarForm(f => ({ ...f, usuario_id: data.id }))
      setCreandoUsuario(false)
      setNuevoUsuarioForm(nuevoUsuarioEmpty())
    }
    setCreandoUsuarioSaving(false)
  }

  async function handleEditSave() {
    if (!editForm || !equipo) return
    setEditSaving(true)
    const payload = {
      ...editForm,
      precio_compra: editForm.precio_compra ? parseFloat(editForm.precio_compra) : null,
      fecha_compra: editForm.fecha_compra || null,
      garantia_hasta: editForm.garantia_hasta || null,
      procesador: editForm.procesador || null,
      ram: editForm.ram || null,
      almacenamiento: editForm.almacenamiento || null,
      descripcion: editForm.descripcion || null,
      proveedor: editForm.proveedor || null,
      notas: editForm.notas || null,
    }
    const { data } = await supabase.from('equipos').update(payload).eq('id', equipo.id).select('*').single()
    if (data) setEquipo(data)
    setEditSaving(false)
    setEditOpen(false)
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" /></div>
  }

  if (!equipo) return <p className="text-slate-500">Equipo no encontrado.</p>

  const asignacionActual = asignaciones.find(a => !a.fecha_devolucion)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/equipos')} className="text-slate-400 hover:text-slate-600">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{equipo.marca} {equipo.modelo}</h1>
          <p className="text-slate-500 text-sm font-mono">{equipo.correlativo_ferco}</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <Badge label={equipo.estado} variant={estadoVariant[equipo.estado]} />
          <button
            onClick={() => { setEditForm(emptyEditForm(equipo)); setEditOpen(true) }}
            className="flex items-center gap-1.5 text-sm text-slate-500 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition-colors"
          >
            <Edit2 size={14} /> Editar
          </button>
        </div>
      </div>

      {/* Info general */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-800 mb-4">Información del Equipo</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          {[
            ['Tipo', equipo.tipo],
            ['Número de Serie', equipo.numero_serie],
            ['Marca', equipo.marca],
            ['Modelo', equipo.modelo],
            ['Procesador', equipo.procesador ?? '—'],
            ['RAM', equipo.ram ?? '—'],
            ['Almacenamiento', equipo.almacenamiento ?? '—'],
            ['País de compra', equipo.pais ?? '—'],
            ['Proveedor', equipo.proveedor ?? '—'],
            ['Precio de Compra', formatMoneda(equipo.precio_compra, equipo.pais)],
            ['Fecha de Compra', equipo.fecha_compra ? format(parseDate(equipo.fecha_compra), 'dd MMM yyyy', { locale: es }) : '—'],
            ['Garantía hasta', equipo.garantia_hasta ? format(parseDate(equipo.garantia_hasta), 'dd MMM yyyy', { locale: es }) : '—'],
            ['Registrado', format(new Date(equipo.created_at), 'dd MMM yyyy', { locale: es })],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-slate-400 text-xs">{label}</p>
              <p className="font-medium text-slate-800 mt-0.5">{value}</p>
            </div>
          ))}
          {equipo.descripcion && (
            <div className="col-span-2 md:col-span-3">
              <p className="text-slate-400 text-xs">Descripción</p>
              <p className="text-slate-700 mt-0.5">{equipo.descripcion}</p>
            </div>
          )}
          {equipo.notas && (
            <div className="col-span-2 md:col-span-3">
              <p className="text-slate-400 text-xs">Notas</p>
              <p className="text-slate-700 mt-0.5 whitespace-pre-wrap">{equipo.notas}</p>
            </div>
          )}
        </div>
      </div>

      {/* Asignación actual */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <User size={16} className="text-slate-500" />
            <h2 className="font-semibold text-slate-800">Asignación Actual</h2>
          </div>
          {!asignacionActual && equipo.estado === 'Activo' && (
            <button
              onClick={openAsignar}
              className="flex items-center gap-1.5 text-sm text-primary-700 border border-primary-300 bg-primary-50 rounded-lg px-3 py-1.5 hover:bg-primary-100 transition-colors font-medium"
            >
              <UserPlus size={14} /> Asignar equipo
            </button>
          )}
        </div>
        {asignacionActual ? (
          <div className="text-sm space-y-1">
            <p className="font-medium text-slate-800 text-base">{asignacionActual.usuario?.nombre} {asignacionActual.usuario?.apellido}</p>
            <p className="text-slate-500">{asignacionActual.usuario?.email}</p>
            <p className="text-slate-400">Centro de Costo: {asignacionActual.usuario?.centro_costo} · {asignacionActual.usuario?.pais}</p>
            <p className="text-slate-400">Asignado: {format(parseDate(asignacionActual.fecha_asignacion), 'dd MMM yyyy', { locale: es })}</p>
          </div>
        ) : (
          <p className="text-sm text-slate-400">Sin asignación activa</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Historial asignaciones */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
            <Calendar size={16} className="text-slate-500" />
            <h2 className="font-semibold text-slate-800">Historial de Asignaciones ({asignaciones.length})</h2>
          </div>
          <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
            {asignaciones.length === 0 && <p className="text-sm text-slate-400 text-center py-6">Sin historial</p>}
            {asignaciones.map(a => (
              <div key={a.id} className="px-5 py-3 text-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-slate-700">{a.usuario?.nombre} {a.usuario?.apellido}</p>
                    <p className="text-slate-400 text-xs">{a.usuario?.email}</p>
                  </div>
                  <Badge label={a.fecha_devolucion ? 'Devuelto' : 'Activo'} variant={a.fecha_devolucion ? 'default' : 'success'} />
                </div>
                <p className="text-slate-400 text-xs mt-1">
                  {format(parseDate(a.fecha_asignacion), 'dd/MM/yyyy')}
                  {a.fecha_devolucion && ` → ${format(parseDate(a.fecha_devolucion), 'dd/MM/yyyy')}`}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Historial mantenimientos */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
            <Wrench size={16} className="text-slate-500" />
            <h2 className="font-semibold text-slate-800">Historial de Mantenimientos ({mantenimientos.length})</h2>
          </div>
          <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
            {mantenimientos.length === 0 && <p className="text-sm text-slate-400 text-center py-6">Sin mantenimientos</p>}
            {mantenimientos.map(m => (
              <div key={m.id} className="px-5 py-3 text-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-slate-700">{m.tipo}</p>
                    <p className="text-slate-400 text-xs">{m.descripcion.slice(0, 50)}</p>
                  </div>
                  <Badge
                    label={m.estado}
                    variant={m.estado === 'Completado' ? 'success' : m.estado === 'En progreso' ? 'info' : m.estado === 'Cancelado' ? 'danger' : 'warning'}
                  />
                </div>
                <p className="text-slate-400 text-xs mt-1">
                  {format(new Date(m.fecha_inicio), 'dd/MM/yyyy')}
                  {m.costo && ` · Q ${m.costo.toLocaleString()}`}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal asignar equipo */}
      <Modal open={asignarOpen} onClose={() => setAsignarOpen(false)} title="Asignar Equipo" size="md">
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Usuario *</label>
            <select
              value={asignarForm.usuario_id}
              onChange={e => setAsignarForm(f => ({ ...f, usuario_id: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Selecciona un usuario...</option>
              {asignarUsuarios.map(u => (
                <option key={u.id} value={u.id}>{u.nombre} {u.apellido} — {u.email}</option>
              ))}
            </select>
            {!creandoUsuario && (
              <button
                type="button"
                onClick={() => setCreandoUsuario(true)}
                className="mt-1.5 text-xs text-primary-600 hover:text-primary-800 hover:underline"
              >
                + Crear nuevo usuario
              </button>
            )}
          </div>

          {creandoUsuario && (
            <div className="border border-slate-200 rounded-lg p-3 space-y-2 bg-slate-50">
              <p className="text-xs font-semibold text-slate-600">Nuevo usuario</p>
              <div className="grid grid-cols-2 gap-2">
                <input value={nuevoUsuarioForm.nombre} onChange={e => setNuevoUsuarioForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Nombre *" className="border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500" />
                <input value={nuevoUsuarioForm.apellido} onChange={e => setNuevoUsuarioForm(f => ({ ...f, apellido: e.target.value }))} placeholder="Apellido *" className="border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500" />
                <input type="email" value={nuevoUsuarioForm.email} onChange={e => setNuevoUsuarioForm(f => ({ ...f, email: e.target.value }))} placeholder="Email *" className="col-span-2 border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500" />
                <input value={nuevoUsuarioForm.centro_costo} onChange={e => setNuevoUsuarioForm(f => ({ ...f, centro_costo: e.target.value }))} placeholder="Centro de costo *" className="border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500" />
                <select value={nuevoUsuarioForm.pais} onChange={e => setNuevoUsuarioForm(f => ({ ...f, pais: e.target.value }))} className="border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500">
                  {PAISES_USUARIO.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <input value={nuevoUsuarioForm.cargo} onChange={e => setNuevoUsuarioForm(f => ({ ...f, cargo: e.target.value }))} placeholder="Cargo" className="border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500" />
                <input value={nuevoUsuarioForm.departamento} onChange={e => setNuevoUsuarioForm(f => ({ ...f, departamento: e.target.value }))} placeholder="Departamento" className="border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500" />
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => { setCreandoUsuario(false); setNuevoUsuarioForm(nuevoUsuarioEmpty()) }} className="text-xs text-slate-500 hover:text-slate-700">Cancelar</button>
                <button
                  onClick={handleCrearUsuarioEnAsignar}
                  disabled={creandoUsuarioSaving || !nuevoUsuarioForm.nombre || !nuevoUsuarioForm.apellido || !nuevoUsuarioForm.email || !nuevoUsuarioForm.centro_costo}
                  className="px-3 py-1 text-xs bg-primary-500 text-primary-800 font-bold rounded hover:bg-primary-600 disabled:opacity-60"
                >
                  {creandoUsuarioSaving ? 'Creando...' : 'Crear y seleccionar'}
                </button>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Fecha de asignación</label>
            <input
              type="date"
              value={asignarForm.fecha_asignacion}
              onChange={e => setAsignarForm(f => ({ ...f, fecha_asignacion: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Motivo</label>
            <input
              value={asignarForm.motivo}
              onChange={e => setAsignarForm(f => ({ ...f, motivo: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Ej: Empleado nuevo, reemplazo..."
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setAsignarOpen(false)} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">
            Cancelar
          </button>
          <button
            onClick={handleAsignar}
            disabled={!asignarForm.usuario_id || asignarSaving}
            className="px-4 py-2 text-sm bg-primary-500 text-primary-800 font-bold rounded-lg hover:bg-primary-600 disabled:opacity-60"
          >
            {asignarSaving ? 'Asignando...' : 'Confirmar Asignación'}
          </button>
        </div>
      </Modal>

      {/* Modal editar equipo */}
      {editForm && (
        <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Editar Equipo" size="lg">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Correlativo FERCO *</label>
              <input
                value={editForm.correlativo_ferco}
                onChange={e => setEditForm(f => f && ({ ...f, correlativo_ferco: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Tipo *</label>
              <select
                value={editForm.tipo}
                onChange={e => setEditForm(f => f && ({ ...f, tipo: e.target.value as TipoEquipo }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Marca *</label>
              <input
                value={editForm.marca}
                onChange={e => setEditForm(f => f && ({ ...f, marca: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Modelo *</label>
              <input
                value={editForm.modelo}
                onChange={e => setEditForm(f => f && ({ ...f, modelo: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Número de Serie *</label>
              <input
                value={editForm.numero_serie}
                onChange={e => setEditForm(f => f && ({ ...f, numero_serie: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Procesador</label>
              <input
                value={editForm.procesador}
                onChange={e => setEditForm(f => f && ({ ...f, procesador: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">RAM</label>
              <input
                value={editForm.ram}
                onChange={e => setEditForm(f => f && ({ ...f, ram: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Almacenamiento</label>
              <input
                value={editForm.almacenamiento}
                onChange={e => setEditForm(f => f && ({ ...f, almacenamiento: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Estado</label>
              <select
                value={editForm.estado}
                onChange={e => setEditForm(f => f && ({ ...f, estado: e.target.value as EstadoEquipo }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {ESTADOS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">País de compra</label>
              <select
                value={editForm.pais}
                onChange={e => setEditForm(f => f && ({ ...f, pais: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {Object.entries(PAIS_MONEDA).map(([p, { simbolo }]) => (
                  <option key={p} value={p}>{p} ({simbolo})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Precio de Compra ({PAIS_MONEDA[editForm.pais]?.simbolo ?? 'Q'})
              </label>
              <input
                type="number"
                value={editForm.precio_compra}
                onChange={e => setEditForm(f => f && ({ ...f, precio_compra: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Fecha de Compra</label>
              <input
                type="date"
                value={editForm.fecha_compra}
                onChange={e => setEditForm(f => f && ({ ...f, fecha_compra: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Garantía hasta</label>
              <input
                type="date"
                value={editForm.garantia_hasta}
                onChange={e => setEditForm(f => f && ({ ...f, garantia_hasta: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Proveedor</label>
              <input
                value={editForm.proveedor}
                onChange={e => setEditForm(f => f && ({ ...f, proveedor: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Descripción</label>
              <textarea
                value={editForm.descripcion}
                onChange={e => setEditForm(f => f && ({ ...f, descripcion: e.target.value }))}
                rows={2}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Notas</label>
              <textarea
                value={editForm.notas}
                onChange={e => setEditForm(f => f && ({ ...f, notas: e.target.value }))}
                rows={2}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setEditOpen(false)} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">
              Cancelar
            </button>
            <button
              onClick={handleEditSave}
              disabled={editSaving}
              className="px-4 py-2 text-sm bg-primary-500 text-primary-800 font-bold rounded-lg hover:bg-primary-600 disabled:opacity-60"
            >
              {editSaving ? 'Guardando...' : 'Actualizar Equipo'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
