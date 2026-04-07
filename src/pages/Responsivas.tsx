import { useEffect, useState } from 'react'
import { Search, Printer, Pencil, Trash2, FileText } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Responsiva } from '../types'
import Badge from '../components/Badge'
import Modal from '../components/Modal'
import ResponsivaModal, { buildEditorFromResponsiva, buildPreviewHtml } from '../components/ResponsivaModal'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default function Responsivas() {
  const [responsivas, setResponsivas] = useState<Responsiva[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editTarget, setEditTarget] = useState<Responsiva | null>(null)
  const [delId, setDelId] = useState<string | null>(null)
  async function fetchAll() {
    setLoading(true)
    const { data } = await supabase
      .from('responsivas')
      .select('*')
      .order('created_at', { ascending: false })
    setResponsivas((data as Responsiva[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  function handlePrint(r: Responsiva) {
    const el = document.getElementById('responsiva-print')
    if (!el) return
    el.innerHTML = buildPreviewHtml(buildEditorFromResponsiva(r))
    window.print()
  }

  async function handleDelete() {
    if (!delId) return
    await supabase.from('responsivas').delete().eq('id', delId)
    setDelId(null)
    fetchAll()
  }

  const filtered = responsivas.filter(r => {
    const q = search.toLowerCase()
    return !q || [r.nombre, r.cargo, r.departamento, r.centro_costo, r.pais]
      .some(v => v?.toLowerCase().includes(q))
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Responsivas</h1>
          <p className="text-slate-500 text-sm mt-1">
            {responsivas.length} documento{responsivas.length !== 1 ? 's' : ''} guardado{responsivas.length !== 1 ? 's' : ''}
            · Generadas desde el detalle de cada usuario
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="relative max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre, cargo, país..."
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Responsable</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Cargo · Depto.</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Centro de Costo</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">País</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Equipos</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Fecha</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Tipo</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-400">
                      <FileText size={32} className="mx-auto mb-2 opacity-30" />
                      <p>No hay responsivas guardadas.</p>
                      <p className="text-xs mt-1">Generálas desde el detalle de cada usuario.</p>
                    </td>
                  </tr>
                )}
                {filtered.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800">{r.nombre}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      <p>{r.cargo || '—'}</p>
                      {r.departamento && <p className="text-slate-400">{r.departamento}</p>}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{r.centro_costo || '—'}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{r.pais || '—'}</td>
                    <td className="px-4 py-3">
                      <Badge label={`${r.equipos.length} equipo${r.equipos.length !== 1 ? 's' : ''}`} variant="info" />
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {format(new Date(r.fecha), 'dd MMM yyyy', { locale: es })}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        label={r.tipo_asignacion}
                        variant={r.tipo_asignacion === 'Devolución' ? 'default' : r.tipo_asignacion === 'Préstamo' ? 'warning' : 'success'}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditTarget(r)}
                          className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-slate-100 rounded transition-colors"
                          title="Editar"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handlePrint(r)}
                          className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-slate-100 rounded transition-colors"
                          title="Imprimir / PDF"
                        >
                          <Printer size={14} />
                        </button>
                        <button
                          onClick={() => setDelId(r.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editTarget && (
        <ResponsivaModal
          open={!!editTarget}
          onClose={() => setEditTarget(null)}
          data={buildEditorFromResponsiva(editTarget)}
          editId={editTarget.id}
          onSaved={() => { setEditTarget(null); fetchAll() }}
        />
      )}

      {/* Delete confirm */}
      <Modal open={!!delId} onClose={() => setDelId(null)} title="Eliminar Responsiva" size="sm">
        <p className="text-sm text-slate-600">¿Eliminar esta responsiva? Esta acción no se puede deshacer.</p>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setDelId(null)} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">
            Cancelar
          </button>
          <button onClick={handleDelete} className="px-4 py-2 text-sm bg-red-500 text-white font-bold rounded-lg hover:bg-red-600">
            Eliminar
          </button>
        </div>
      </Modal>

      {/* Hidden print target */}
      <div id="responsiva-print" className="hidden" />
    </div>
  )
}
