import { supabase } from './supabase'

const SESSION_KEY = 'ferco_session'

export interface AppUser {
  id: string
  username: string
  nombre: string
  rol: 'admin' | 'viewer'
}

export async function login(username: string, password: string): Promise<boolean> {
  const { data } = await supabase
    .from('app_users')
    .select('id, username, nombre, rol, activo, password')
    .eq('username', username)
    .single()

  if (!data || !data.activo || data.password !== password) return false

  const session: AppUser = {
    id: data.id,
    username: data.username,
    nombre: data.nombre,
    rol: data.rol,
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  return true
}

export function logout() {
  localStorage.removeItem(SESSION_KEY)
}

export function getSession(): AppUser | null {
  const raw = localStorage.getItem(SESSION_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AppUser
  } catch {
    return null
  }
}

export function isAuthenticated(): boolean {
  return getSession() !== null
}

export function isAdmin(): boolean {
  return getSession()?.rol === 'admin'
}
