import { useEffect, useState } from 'react'
import { Monitor, Users, ClipboardList, Wrench, AlertTriangle, CheckCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import StatCard from '../components/StatCard'
import Badge from '../components/Badge'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Asignacion, Mantenimiento } from '../types'

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalEquipos: 0,
    equiposActivos: 0,
    equiposMantenimiento: 0,
    totalUsuarios: 0,
    asignacionesActivas: 0,
    mantenimientosPendientes: 0,
  })
  const [ultimasAsignaciones, setUltimasAsignaciones] = useState<Asignacion[]>([])
  const [ultimosMantenimientos, setUltimosMantenimientos] = useState<Mantenimiento[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const [
        { count: totalEquipos },
        { count: equiposActivos },
        { count: equiposMantenimiento },
        { count: totalUsuarios },
        { count: asignacionesActivas },
        { count: mantenimientosPendientes },
        { data: asignaciones },
        { data: mantenimientos },
      ] = await Promise.all([
        supabase.from('equipos').select('*', { count: 'exact', head: true }),
        supabase.from('equipos').select('*', { count: 'exact', head: true }).eq('estado', 'Activo'),
        supabase.from('equipos').select('*', { count: 'exact', head: true }).eq('estado', 'En mantenimiento'),
        supabase.from('usuarios').select('*', { count: 'exact', head: true }).eq('activo', true),
        supabase.from('asignaciones').select('*', { count: 'exact', head: true }).is('fecha_devolucion', null),
        supabase.from('mantenimientos').select('*', { count: 'exact', head: true }).in('estado', ['Pendiente', 'En progreso']),
        supabase.from('asignaciones')
          .select('*, equipo:equipos(correlativo_ferco, marca, modelo, tipo), usuario:usuarios(nombre, apellido, email)')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase.from('mantenimientos')
          .select('*, equipo:equipos(correlativo_ferco, marca, modelo)')
          .order('created_at', { ascending: false })
          .limit(5),
      ])

      setStats({
        totalEquipos: totalEquipos ?? 0,
        equiposActivos: equiposActivos ?? 0,
        equiposMantenimiento: equiposMantenimiento ?? 0,
        totalUsuarios: totalUsuarios ?? 0,
        asignacionesActivas: asignacionesActivas ?? 0,
        mantenimientosPendientes: mantenimientosPendientes ?? 0,
      })
      setUltimasAsignaciones((asignaciones as Asignacion[]) ?? [])
      setUltimosMantenimientos((mantenimientos as Mantenimiento[]) ?? [])
      setLoading(false)
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Resumen general de gestión de equipos</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title="Total Equipos" value={stats.totalEquipos} icon={Monitor} color="blue" subtitle={`${stats.equiposActivos} activos`} />
        <StatCard title="En Mantenimiento" value={stats.equiposMantenimiento} icon={Wrench} color="yellow" />
        <StatCard title="Usuarios Activos" value={stats.totalUsuarios} icon={Users} color="green" />
        <StatCard title="Asignaciones Activas" value={stats.asignacionesActivas} icon={ClipboardList} color="purple" />
        <StatCard title="Mantenimientos Pendientes" value={stats.mantenimientosPendientes} icon={AlertTriangle} color="red" />
        <StatCard title="Equipos OK" value={stats.equiposActivos} icon={CheckCircle} color="green" subtitle="en estado activo" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Últimas asignaciones */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800">Últimas Asignaciones</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {ultimasAsignaciones.length === 0 && (
              <p className="text-sm text-slate-400 px-5 py-6 text-center">Sin asignaciones aún</p>
            )}
            {ultimasAsignaciones.map((a) => (
              <div key={a.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-700">
                    {a.equipo?.marca} {a.equipo?.modelo}
                  </p>
                  <p className="text-xs text-slate-400">
                    {a.usuario?.nombre} {a.usuario?.apellido}
                  </p>
                </div>
                <div className="text-right">
                  <Badge label={a.fecha_devolucion ? 'Devuelto' : 'Activo'} variant={a.fecha_devolucion ? 'default' : 'success'} />
                  <p className="text-xs text-slate-400 mt-1">
                    {format(new Date(a.fecha_asignacion), 'dd MMM yyyy', { locale: es })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Últimos mantenimientos */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800">Últimos Mantenimientos</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {ultimosMantenimientos.length === 0 && (
              <p className="text-sm text-slate-400 px-5 py-6 text-center">Sin mantenimientos aún</p>
            )}
            {ultimosMantenimientos.map((m) => (
              <div key={m.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-700">
                    {m.equipo?.marca} — {m.equipo?.modelo}
                  </p>
                  <p className="text-xs text-slate-400">{m.tipo} · {m.descripcion.slice(0, 40)}</p>
                </div>
                <div className="text-right">
                  <Badge
                    label={m.estado}
                    variant={
                      m.estado === 'Completado' ? 'success' :
                      m.estado === 'En progreso' ? 'info' :
                      m.estado === 'Cancelado' ? 'danger' : 'warning'
                    }
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    {format(new Date(m.fecha_inicio), 'dd MMM yyyy', { locale: es })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
