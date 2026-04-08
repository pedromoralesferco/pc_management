import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Monitor, FileText } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatMoneda, monedaDePais } from '../lib/moneda'
import type { Usuario, Asignacion } from '../types'
import Badge from '../components/Badge'
import ResponsivaModal, { buildEditorFromUsuario } from '../components/ResponsivaModal'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default function UsuarioDetalle() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([])
  const [loading, setLoading] = useState(true)
  const [responsivaOpen, setResponsivaOpen] = useState(false)

  useEffect(() => {
    async function fetchData() {
      const [{ data: u }, { data: asig }] = await Promise.all([
        supabase.from('usuarios').select('*').eq('id', id!).single(),
        supabase.from('asignaciones')
          .select('*, equipo:equipos(correlativo_ferco, marca, modelo, tipo, estado, numero_serie, precio_compra, pais)')
          .eq('usuario_id', id!)
          .order('fecha_asignacion', { ascending: false }),
      ])
      setUsuario(u)
      setAsignaciones((asig as Asignacion[]) ?? [])
      setLoading(false)
    }
    fetchData()
  }, [id])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!usuario) return <p className="text-slate-500">Usuario no encontrado.</p>

  const asignacionesActivas = asignaciones.filter(a => !a.fecha_devolucion)
  const historial = asignaciones.filter(a => a.fecha_devolucion)
  const totalEquipos = new Set(asignaciones.map(a => a.equipo_id)).size
  // Totales agrupados por moneda del equipo
  const totalesPorPais: Record<string, { simbolo: string; locale: string; total: number }> = {}
  asignacionesActivas.forEach(a => {
    const precio = Number((a.equipo as any)?.precio_compra) || 0
    if (!precio) return
    const pais = (a.equipo as any)?.pais ?? null
    const key = pais ?? '__sin_pais__'
    if (!totalesPorPais[key]) {
      const { simbolo, locale } = monedaDePais(pais)
      totalesPorPais[key] = { simbolo, locale, total: 0 }
    }
    totalesPorPais[key].total += precio
  })
  const totalValorFmt = Object.keys(totalesPorPais).length === 0
    ? null
    : Object.values(totalesPorPais)
        .map(({ simbolo, locale, total }) =>
          `${simbolo} ${Number(total).toLocaleString(locale, { minimumFractionDigits: 2 })}`
        )
        .join(' + ')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/usuarios')} className="text-slate-400 hover:text-slate-600">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{usuario.nombre} {usuario.apellido}</h1>
          <p className="text-slate-500 text-sm">{usuario.email}</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {asignacionesActivas.length > 0 && (
            <button
              onClick={() => setResponsivaOpen(true)}
              className="flex items-center gap-2 bg-green-50 border border-green-300 text-green-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors"
            >
              <FileText size={15} /> Generar Responsiva
            </button>
          )}
          <Badge label={usuario.activo ? 'Activo' : 'Inactivo'} variant={usuario.activo ? 'success' : 'default'} />
        </div>
      </div>

      {/* Info */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-800 mb-4">Información del Usuario</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          {[
            ['Email',           usuario.email],
            ['Centro de Costo', usuario.centro_costo],
            ['País',            usuario.pais],
            ['Departamento',    usuario.departamento ?? '—'],
            ['Cargo',           usuario.cargo ?? '—'],
            ['Registrado',      format(new Date(usuario.created_at), 'dd MMM yyyy', { locale: es })],
          ].map(([lbl, val]) => (
            <div key={lbl}>
              <p className="text-slate-400 text-xs">{lbl}</p>
              <p className="font-medium text-slate-800 mt-0.5">{val}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-2xl font-bold text-primary-600">{asignaciones.length}</p>
          <p className="text-xs text-slate-500 mt-1">Total asignaciones</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{totalEquipos}</p>
          <p className="text-xs text-slate-500 mt-1">Equipos distintos</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-2xl font-bold text-purple-600">{asignacionesActivas.length}</p>
          <p className="text-xs text-slate-500 mt-1">Equipos activos</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-lg font-bold text-slate-700 leading-tight">{totalValorFmt ?? '—'}</p>
          <p className="text-xs text-slate-500 mt-1">Valor asignado</p>
        </div>
      </div>

      {/* Equipos activos */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Monitor size={16} className="text-slate-500" />
            <h2 className="font-semibold text-slate-800">
              Equipos Asignados Actualmente
              <span className="ml-2 text-sm font-normal text-slate-400">({asignacionesActivas.length})</span>
            </h2>
          </div>
          {totalValorFmt && (
            <span className="text-sm font-semibold text-slate-600">
              Total: {totalValorFmt}
            </span>
          )}
        </div>
        <div className="divide-y divide-slate-100">
          {asignacionesActivas.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-6">Sin equipos asignados actualmente</p>
          )}
          {asignacionesActivas.map(a => (
            <div key={a.id} className="px-5 py-4 flex items-center justify-between text-sm">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                  <Monitor size={16} className="text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-slate-800">{a.equipo?.marca} {a.equipo?.modelo}</p>
                  <p className="text-slate-400 text-xs font-mono">{a.equipo?.correlativo_ferco} · {a.equipo?.tipo}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-700">
                  {formatMoneda((a.equipo as any)?.precio_compra, (a.equipo as any)?.pais)}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Desde {format(new Date(a.fecha_asignacion), 'dd MMM yyyy', { locale: es })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Historial de devoluciones */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">
            Historial de Devoluciones
            <span className="ml-2 text-sm font-normal text-slate-400">({historial.length})</span>
          </h2>
        </div>
        <div className="divide-y divide-slate-100">
          {historial.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-6">Sin devoluciones registradas</p>
          )}
          {historial.map(a => (
            <div key={a.id} className="px-5 py-3 flex items-center justify-between text-sm">
              <div>
                <p className="font-medium text-slate-700">{a.equipo?.marca} {a.equipo?.modelo}</p>
                <p className="text-slate-400 text-xs font-mono">{a.equipo?.correlativo_ferco} · {a.equipo?.tipo}</p>
              </div>
              <div className="text-right">
                <Badge label="Devuelto" variant="default" />
                <p className="text-xs text-slate-400 mt-1">
                  {format(new Date(a.fecha_asignacion), 'dd/MM/yyyy')} → {format(new Date(a.fecha_devolucion!), 'dd/MM/yyyy')}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Responsiva modal */}
      {responsivaOpen && (
        <ResponsivaModal
          open={responsivaOpen}
          onClose={() => setResponsivaOpen(false)}
          data={buildEditorFromUsuario(usuario, asignacionesActivas)}
          onSaved={() => setResponsivaOpen(false)}
        />
      )}
    </div>
  )
}
