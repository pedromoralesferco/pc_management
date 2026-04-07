import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Monitor } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Usuario, Asignacion } from '../types'
import Badge from '../components/Badge'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default function UsuarioDetalle() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      const [{ data: u }, { data: asig }] = await Promise.all([
        supabase.from('usuarios').select('*').eq('id', id!).single(),
        supabase.from('asignaciones')
          .select('*, equipo:equipos(correlativo_ferco, marca, modelo, tipo, estado)')
          .eq('usuario_id', id!)
          .order('fecha_asignacion', { ascending: false }),
      ])
      setUsuario(u)
      setAsignaciones((asig as Asignacion[]) ?? [])
      setLoading(false)
    }
    fetch()
  }, [id])

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" /></div>
  if (!usuario) return <p className="text-slate-500">Usuario no encontrado.</p>

  const asignacionActual = asignaciones.find(a => !a.fecha_devolucion)
  const totalEquipos = new Set(asignaciones.map(a => a.equipo_id)).size

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/usuarios')} className="text-slate-400 hover:text-slate-600">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{usuario.nombre} {usuario.apellido}</h1>
          <p className="text-slate-500 text-sm">{usuario.email}</p>
        </div>
        <div className="ml-auto">
          <Badge label={usuario.activo ? 'Activo' : 'Inactivo'} variant={usuario.activo ? 'success' : 'default'} />
        </div>
      </div>

      {/* Info */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-800 mb-4">Información del Usuario</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          {[
            ['Email', usuario.email],
            ['Centro de Costo', usuario.centro_costo],
            ['País', usuario.pais],
            ['Departamento', usuario.departamento ?? '—'],
            ['Cargo', usuario.cargo ?? '—'],
            ['Registrado', format(new Date(usuario.created_at), 'dd MMM yyyy', { locale: es })],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-slate-400 text-xs">{label}</p>
              <p className="font-medium text-slate-800 mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Stats rápidos */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-2xl font-bold text-primary-600">{asignaciones.length}</p>
          <p className="text-xs text-slate-500 mt-1">Total asignaciones</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{totalEquipos}</p>
          <p className="text-xs text-slate-500 mt-1">Equipos distintos</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-2xl font-bold text-purple-600">{asignacionActual ? 1 : 0}</p>
          <p className="text-xs text-slate-500 mt-1">Equipo actual</p>
        </div>
      </div>

      {/* Equipo actual */}
      {asignacionActual && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-3">
            <Monitor size={16} className="text-slate-500" />
            <h2 className="font-semibold text-slate-800">Equipo Asignado Actualmente</h2>
          </div>
          <div className="text-sm">
            <p className="font-medium text-slate-800 text-base">{asignacionActual.equipo?.marca} {asignacionActual.equipo?.modelo}</p>
            <p className="text-slate-400 font-mono">{asignacionActual.equipo?.correlativo_ferco}</p>
            <p className="text-slate-400 mt-1">Desde: {format(new Date(asignacionActual.fecha_asignacion), 'dd MMM yyyy', { locale: es })}</p>
          </div>
        </div>
      )}

      {/* Historial */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">Historial de Equipos ({asignaciones.length})</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {asignaciones.length === 0 && <p className="text-sm text-slate-400 text-center py-6">Sin historial de asignaciones</p>}
          {asignaciones.map(a => (
            <div key={a.id} className="px-5 py-3 flex items-center justify-between text-sm">
              <div>
                <p className="font-medium text-slate-700">{a.equipo?.marca} {a.equipo?.modelo}</p>
                <p className="text-slate-400 text-xs font-mono">{a.equipo?.correlativo_ferco} · {a.equipo?.tipo}</p>
              </div>
              <div className="text-right">
                <Badge label={a.fecha_devolucion ? 'Devuelto' : 'Activo'} variant={a.fecha_devolucion ? 'default' : 'success'} />
                <p className="text-xs text-slate-400 mt-1">
                  {format(new Date(a.fecha_asignacion), 'dd/MM/yyyy')}
                  {a.fecha_devolucion && ` → ${format(new Date(a.fecha_devolucion), 'dd/MM/yyyy')}`}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
