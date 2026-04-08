export type TipoEquipo = 'PC' | 'Monitor' | 'Tablet' | 'Laptop' | 'Otro'
export type EstadoEquipo = 'Activo' | 'En mantenimiento' | 'Dado de baja' | 'En bodega'
export type TipoMantenimiento = 'Preventivo' | 'Correctivo' | 'Reparacion'
export type EstadoMantenimiento = 'Pendiente' | 'En progreso' | 'Completado' | 'Cancelado'

export interface Equipo {
  id: string
  correlativo_ferco: string
  tipo: TipoEquipo
  marca: string
  modelo: string
  numero_serie: string
  descripcion: string | null
  estado: EstadoEquipo
  pais: string | null
  fecha_compra: string | null
  garantia_hasta: string | null
  proveedor: string | null
  precio_compra: number | null
  procesador: string | null
  ram: string | null
  almacenamiento: string | null
  notas: string | null
  created_at: string
  updated_at: string
}

export interface Usuario {
  id: string
  email: string
  nombre: string
  apellido: string
  centro_costo: string
  pais: string
  departamento: string | null
  cargo: string | null
  activo: boolean
  created_at: string
  updated_at: string
}

export interface Asignacion {
  id: string
  equipo_id: string
  usuario_id: string
  fecha_asignacion: string
  fecha_devolucion: string | null
  motivo: string | null
  asignado_por: string | null
  notas: string | null
  created_at: string
  // joins
  equipo?: Equipo
  usuario?: Usuario
}

export interface Mantenimiento {
  id: string
  equipo_id: string
  tipo: TipoMantenimiento
  descripcion: string
  fecha_inicio: string
  fecha_fin: string | null
  proveedor_servicio: string | null
  costo: number | null
  realizado_por: string | null
  estado: EstadoMantenimiento
  resultado: string | null
  notas: string | null
  created_at: string
  // joins
  equipo?: Equipo
}

export type TipoAsignacionResponsiva = 'Asignación' | 'Préstamo' | 'Devolución'

export interface EquipoResponsiva {
  id: string
  correlativo_ferco: string
  marca: string
  modelo: string
  numero_serie: string
  tipo: string
  pais: string | null
  precio_compra: number | null
}

export interface Responsiva {
  id: string
  usuario_id: string | null
  nombre: string
  cargo: string | null
  departamento: string | null
  centro_costo: string | null
  pais: string | null
  tipo_asignacion: TipoAsignacionResponsiva
  entregado_por: string | null
  observaciones: string | null
  texto_legal: string | null
  fecha: string
  equipos: EquipoResponsiva[]
  firmada: boolean
  created_at: string
  // join
  usuario?: Usuario
}
