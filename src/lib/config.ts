import { supabase } from './supabase'

export interface AppConfig {
  nombre_empresa: string
}

const DEFAULT_CONFIG: AppConfig = { nombre_empresa: 'FERCO Total Look' }

let cache: AppConfig | null = null

export async function getConfig(): Promise<AppConfig> {
  if (cache) return cache
  const { data } = await supabase
    .from('configuracion')
    .select('nombre_empresa')
    .single()
  cache = data ?? DEFAULT_CONFIG
  return cache
}

export function invalidateConfig() {
  cache = null
}
