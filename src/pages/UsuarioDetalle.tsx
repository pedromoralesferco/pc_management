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

  const asignacionesActivas = asignaciones.filter(a => !a.fecha_devolucion)
  const totalEquipos = new Set(asignaciones.map(a => a.equipo_id)).size
  const historial = asignaciones.filter(a => a.fecha_devolucion)

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

      {/* Stats */}
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
          <p className="text-2xl font-bold text-purple-600">{asignacionesActivas.length}</p>
          <p className="text-xs text-slate-500 mt-1">Equipos activos</p>
        </div>
      </div>

      {/* Equipos activos actualmente */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
          <Monitor size={16} className="text-slate-500" />
          <h2 className="font-semibold text-slate-800">
            Equipos Asignados Actualmente
            <span className="ml-2 text-sm font-normal text-slate-400">({asignacionesActivas.length})</span>
          </h2>
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
                <Badge label="Activo" variant="success" />
                <p className="text-xs text-slate-400 mt-1">
                  Desde {format(new Date(a.fecha_asignacion), 'dd MMM yyyy', { locale: es })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Historial (devueltos) */}
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
    </div>
  )
}
