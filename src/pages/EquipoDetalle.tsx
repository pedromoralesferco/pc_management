import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, User, Wrench, Calendar } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Equipo, Asignacion, Mantenimiento } from '../types'
import { formatMoneda } from '../lib/moneda'
import Badge from '../components/Badge'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const estadoVariant: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  'Activo': 'success',
  'En mantenimiento': 'warning',
  'Dado de baja': 'danger',
  'En bodega': 'default',
}

export default function EquipoDetalle() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [equipo, setEquipo] = useState<Equipo | null>(null)
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([])
  const [mantenimientos, setMantenimientos] = useState<Mantenimiento[]>([])
  const [loading, setLoading] = useState(true)

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
        <div className="ml-auto">
          <Badge label={equipo.estado} variant={estadoVariant[equipo.estado]} />
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
            ['Fecha de Compra', equipo.fecha_compra ? format(new Date(equipo.fecha_compra), 'dd MMM yyyy', { locale: es }) : '—'],
            ['Garantía hasta', equipo.garantia_hasta ? format(new Date(equipo.garantia_hasta), 'dd MMM yyyy', { locale: es }) : '—'],
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
        </div>
      </div>

      {/* Asignación actual */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <User size={16} className="text-slate-500" />
          <h2 className="font-semibold text-slate-800">Asignación Actual</h2>
        </div>
        {asignacionActual ? (
          <div className="text-sm space-y-1">
            <p className="font-medium text-slate-800 text-base">{asignacionActual.usuario?.nombre} {asignacionActual.usuario?.apellido}</p>
            <p className="text-slate-500">{asignacionActual.usuario?.email}</p>
            <p className="text-slate-400">Centro de Costo: {asignacionActual.usuario?.centro_costo} · {asignacionActual.usuario?.pais}</p>
            <p className="text-slate-400">Asignado: {format(new Date(asignacionActual.fecha_asignacion), 'dd MMM yyyy', { locale: es })}</p>
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
                  {format(new Date(a.fecha_asignacion), 'dd/MM/yyyy')}
                  {a.fecha_devolucion && ` → ${format(new Date(a.fecha_devolucion), 'dd/MM/yyyy')}`}
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
    </div>
  )
}
