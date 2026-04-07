import { useRef, useState } from 'react'
import { Printer, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { monedaDePais, formatMoneda } from '../lib/moneda'
import type { Usuario, Asignacion, TipoAsignacionResponsiva, EquipoResponsiva, Responsiva } from '../types'

const EMPRESA = 'FERCO Total Look'
const SUBTITULO = 'Responsiva de Entrega de Equipos'
const TEXTO_LEGAL =
  'Yo, {nombre}, certifico que asumo la responsabilidad de cualquier daño que pueda causar al equipo asignado. Me comprometo a garantizar su integridad, o a reemplazarlo o reembolsar el costo de reemplazo en caso de pérdida o daño irreparable por negligencia. Es mi responsabilidad notificar a soporte técnico cualquier desgaste, avería o necesidad de mantenimiento.'

export type EditorData = {
  empresa: string
  subtitulo: string
  usuario_id: string | null
  nombre: string
  cargo: string
  departamento: string
  centro_costo: string
  pais: string
  tipo_asignacion: TipoAsignacionResponsiva
  entregado_por: string
  observaciones: string
  texto_legal: string
  fecha: string
  equipos: EquipoResponsiva[]
}

export function buildEditorFromUsuario(
  usuario: Usuario,
  asignacionesActivas: Asignacion[]
): EditorData {
  return {
    empresa: EMPRESA,
    subtitulo: SUBTITULO,
    usuario_id: usuario.id,
    nombre: `${usuario.nombre} ${usuario.apellido}`,
    cargo: usuario.cargo ?? '',
    departamento: usuario.departamento ?? '',
    centro_costo: usuario.centro_costo,
    pais: usuario.pais,
    tipo_asignacion: 'Asignación',
    entregado_por: '',
    observaciones: '',
    texto_legal: TEXTO_LEGAL,
    fecha: new Date().toISOString().split('T')[0],
    equipos: asignacionesActivas
      .filter(a => a.equipo)
      .map(a => ({
        id: a.equipo_id,
        correlativo_ferco: a.equipo!.correlativo_ferco,
        marca: a.equipo!.marca,
        modelo: a.equipo!.modelo,
        numero_serie: (a.equipo as any).numero_serie ?? '',
        tipo: a.equipo!.tipo,
        precio_compra: (a.equipo as any).precio_compra ?? null,
      })),
  }
}

export function buildEditorFromResponsiva(r: Responsiva): EditorData {
  return {
    empresa: EMPRESA,
    subtitulo: SUBTITULO,
    usuario_id: r.usuario_id,
    nombre: r.nombre,
    cargo: r.cargo ?? '',
    departamento: r.departamento ?? '',
    centro_costo: r.centro_costo ?? '',
    pais: r.pais ?? '',
    tipo_asignacion: r.tipo_asignacion,
    entregado_por: r.entregado_por ?? '',
    observaciones: r.observaciones ?? '',
    texto_legal: r.texto_legal ?? TEXTO_LEGAL,
    fecha: r.fecha,
    equipos: r.equipos,
  }
}

export function buildPreviewHtml(d: EditorData): string {
  const { simbolo } = monedaDePais(d.pais)
  const legal = d.texto_legal.replace(/\{nombre\}/g, d.nombre || '_______________')

  const filas = d.equipos.map(e => `
    <tr>
      <td style="border:.5px solid #ccc;padding:4px 6px;text-align:center;font-size:8.5pt">1</td>
      <td style="border:.5px solid #ccc;padding:4px 6px;font-size:8.5pt">${e.marca || '—'}</td>
      <td style="border:.5px solid #ccc;padding:4px 6px;font-size:8.5pt">${e.modelo || '—'}</td>
      <td style="border:.5px solid #ccc;padding:4px 6px;font-family:monospace;font-size:7.5pt">${e.numero_serie || '—'}</td>
      <td style="border:.5px solid #ccc;padding:4px 6px;font-family:monospace;font-size:7.5pt">${e.correlativo_ferco || '—'}</td>
      <td style="border:.5px solid #ccc;padding:4px 6px;font-size:8.5pt">${e.tipo || '—'}</td>
      <td style="border:.5px solid #ccc;padding:4px 6px;text-align:right;font-size:8.5pt">${formatMoneda(e.precio_compra, d.pais)}</td>
    </tr>`).join('')

  const filasPad = d.equipos.length < 3
    ? Array(3 - d.equipos.length).fill(
        `<tr><td style="border:.5px solid #ccc;padding:4px 6px;height:18px" colspan="7"></td></tr>`
      ).join('')
    : ''

  const total = d.equipos.reduce((s, e) => s + (Number(e.precio_compra) || 0), 0)
  const totalFmt = total
    ? `${simbolo} ${Number(total).toLocaleString(monedaDePais(d.pais).locale, { minimumFractionDigits: 2 })}`
    : '—'

  return `
    <div style="text-align:center;font-size:12pt;font-weight:700;text-transform:uppercase;
      border-bottom:2.5px solid #000;padding-bottom:4px;margin-bottom:4px">${d.empresa}</div>
    <div style="text-align:center;font-size:8.5pt;color:#333;margin-bottom:10px">${d.subtitulo}</div>

    <div style="font-size:7.5pt;font-weight:700;text-transform:uppercase;background:#e0e0e0;
      padding:3px 7px;border-left:3px solid #555;margin:8px 0 4px">Datos del responsable</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;border:1px solid #aaa;margin-bottom:6px">
      <div style="border:.5px solid #ccc;padding:4px 6px">
        <span style="font-size:7pt;color:#555;display:block">Nombre</span>
        <span style="font-size:9.5pt;font-weight:700;display:block;min-height:14px">${d.nombre || '___________________________'}</span>
      </div>
      <div style="border:.5px solid #ccc;padding:4px 6px">
        <span style="font-size:7pt;color:#555;display:block">Cargo / Puesto</span>
        <span style="font-size:9.5pt;font-weight:700;display:block;min-height:14px">${d.cargo || '___________________________'}</span>
      </div>
      <div style="border:.5px solid #ccc;padding:4px 6px">
        <span style="font-size:7pt;color:#555;display:block">Departamento</span>
        <span style="font-size:9.5pt;font-weight:700;display:block;min-height:14px">${d.departamento || '___________________________'}</span>
      </div>
      <div style="border:.5px solid #ccc;padding:4px 6px">
        <span style="font-size:7pt;color:#555;display:block">Centro de Costo</span>
        <span style="font-size:9.5pt;font-weight:700;display:block;min-height:14px">${d.centro_costo || '___________________________'}</span>
      </div>
      <div style="border:.5px solid #ccc;padding:4px 6px">
        <span style="font-size:7pt;color:#555;display:block">País</span>
        <span style="font-size:9.5pt;font-weight:700;display:block;min-height:14px">${d.pais || '___________________________'}</span>
      </div>
      <div style="border:.5px solid #ccc;padding:4px 6px">
        <span style="font-size:7pt;color:#555;display:block">Fecha</span>
        <span style="font-size:9.5pt;font-weight:700;display:block;min-height:14px">${d.fecha || '___________________________'}</span>
      </div>
      <div style="border:.5px solid #ccc;padding:4px 6px;grid-column:1/-1">
        <span style="font-size:7pt;color:#555;display:block">Tipo de asignación</span>
        <span style="font-size:9.5pt;font-weight:700;display:block">
          <span style="border:1px solid #000;padding:2px 10px;font-size:7.5pt;text-transform:uppercase">${d.tipo_asignacion}</span>
        </span>
      </div>
    </div>

    <div style="font-size:7.5pt;font-weight:700;text-transform:uppercase;background:#e0e0e0;
      padding:3px 7px;border-left:3px solid #555;margin:8px 0 4px">
      Equipos asignados — ${d.equipos.length} dispositivo${d.equipos.length !== 1 ? 's' : ''}
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:8.5pt;margin-bottom:6px">
      <thead><tr>
        <th style="background:#e0e0e0;border:1px solid #aaa;padding:3px 6px;text-align:left;font-size:7.5pt">Cant.</th>
        <th style="background:#e0e0e0;border:1px solid #aaa;padding:3px 6px;text-align:left;font-size:7.5pt">Marca</th>
        <th style="background:#e0e0e0;border:1px solid #aaa;padding:3px 6px;text-align:left;font-size:7.5pt">Modelo</th>
        <th style="background:#e0e0e0;border:1px solid #aaa;padding:3px 6px;text-align:left;font-size:7.5pt">No. Serie</th>
        <th style="background:#e0e0e0;border:1px solid #aaa;padding:3px 6px;text-align:left;font-size:7.5pt">Correlativo</th>
        <th style="background:#e0e0e0;border:1px solid #aaa;padding:3px 6px;text-align:left;font-size:7.5pt">Tipo</th>
        <th style="background:#e0e0e0;border:1px solid #aaa;padding:3px 6px;text-align:right;font-size:7.5pt">Valor</th>
      </tr></thead>
      <tbody>
        ${filas}${filasPad}
        <tr>
          <td colspan="5" style="border:.5px solid #ccc;padding:4px 6px"></td>
          <td style="border:.5px solid #ccc;padding:4px 6px;font-weight:700;text-align:right;font-size:7.5pt">Total:</td>
          <td style="border:.5px solid #ccc;padding:4px 6px;font-weight:700;text-align:right;font-size:9pt">${totalFmt}</td>
        </tr>
      </tbody>
    </table>

    <div style="font-size:7.5pt;font-weight:700;text-transform:uppercase;background:#e0e0e0;
      padding:3px 7px;border-left:3px solid #555;margin:8px 0 4px">Observaciones</div>
    <div style="border:1px solid #aaa;min-height:40px;padding:5px;font-size:8.5pt;margin-bottom:8px">${d.observaciones || ''}</div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:16px">
      <div style="text-align:center">
        <div style="border-top:1px solid #000;margin:28px 10px 4px"></div>
        <div style="font-size:8.5pt;color:#000">${d.entregado_por || '___________________________'}</div>
        <div style="font-size:7pt;color:#555">Entregado por</div>
      </div>
      <div style="text-align:center">
        <div style="border-top:1px solid #000;margin:28px 10px 4px"></div>
        <div style="font-size:8.5pt;color:#000">${d.nombre || '___________________________'}</div>
        <div style="font-size:7pt;color:#555">Recibido por — Firma y nombre</div>
      </div>
    </div>

    <div style="font-size:7pt;color:#444;line-height:1.6;margin-top:10px;
      border-top:.5px solid #ccc;padding-top:6px">${legal}</div>
  `
}

interface Props {
  open: boolean
  onClose: () => void
  data: EditorData
  editId?: string | null   // si viene de una responsiva guardada
  onSaved?: () => void
}

export default function ResponsivaModal({ open, onClose, data: initialData, editId, onSaved }: Props) {
  const [d, setD] = useState<EditorData>(initialData)
  const [saving, setSaving] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  // Reset when modal opens with new data
  useState(() => { setD(initialData) })

  // Keep in sync when initialData changes (new user opened)
  if (!open) return null

  function set(patch: Partial<EditorData>) {
    setD(prev => ({ ...prev, ...patch }))
  }

  function handlePrint() {
    if (!printRef.current) return
    printRef.current.innerHTML = buildPreviewHtml(d)
    window.print()
  }

  async function handleSave() {
    if (!d.nombre.trim()) return
    setSaving(true)
    const payload = {
      usuario_id: d.usuario_id,
      nombre: d.nombre.trim(),
      cargo: d.cargo || null,
      departamento: d.departamento || null,
      centro_costo: d.centro_costo || null,
      pais: d.pais || null,
      tipo_asignacion: d.tipo_asignacion,
      entregado_por: d.entregado_por || null,
      observaciones: d.observaciones || null,
      texto_legal: d.texto_legal || null,
      fecha: d.fecha,
      equipos: d.equipos,
    }
    if (editId) {
      await supabase.from('responsivas').update(payload).eq('id', editId)
    } else {
      await supabase.from('responsivas').insert(payload)
    }
    setSaving(false)
    onSaved?.()
    onClose()
  }

  const inp = 'w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500'
  const label = 'block text-xs font-medium text-slate-500 mb-1'

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto">
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-5xl my-4 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
            <div>
              <h2 className="text-base font-semibold text-slate-800">Responsiva de entrega</h2>
              <p className="text-xs text-slate-400 mt-0.5">{d.nombre} · {d.equipos.length} equipo{d.equipos.length !== 1 ? 's' : ''}</p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
          </div>

          {/* Body: form + preview */}
          <div className="grid grid-cols-[280px_1fr] overflow-hidden" style={{ maxHeight: '76vh' }}>

            {/* LEFT: Form */}
            <div className="overflow-y-auto px-5 py-4 border-r border-slate-100 space-y-3">

              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-1 border-b">Encabezado</p>
              <div>
                <label className={label}>Empresa</label>
                <input value={d.empresa} onChange={e => set({ empresa: e.target.value })} className={inp} />
              </div>
              <div>
                <label className={label}>Subtítulo</label>
                <input value={d.subtitulo} onChange={e => set({ subtitulo: e.target.value })} className={inp} />
              </div>

              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-1 border-b pt-2">Responsable</p>
              <div>
                <label className={label}>Nombre completo</label>
                <input value={d.nombre} onChange={e => set({ nombre: e.target.value })} className={inp} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={label}>Cargo</label>
                  <input value={d.cargo} onChange={e => set({ cargo: e.target.value })} className={inp} />
                </div>
                <div>
                  <label className={label}>Departamento</label>
                  <input value={d.departamento} onChange={e => set({ departamento: e.target.value })} className={inp} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={label}>Centro de Costo</label>
                  <input value={d.centro_costo} onChange={e => set({ centro_costo: e.target.value })} className={inp} />
                </div>
                <div>
                  <label className={label}>País</label>
                  <input value={d.pais} onChange={e => set({ pais: e.target.value })} className={inp} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={label}>Fecha</label>
                  <input type="date" value={d.fecha} onChange={e => set({ fecha: e.target.value })} className={inp} />
                </div>
                <div>
                  <label className={label}>Tipo</label>
                  <select value={d.tipo_asignacion} onChange={e => set({ tipo_asignacion: e.target.value as TipoAsignacionResponsiva })} className={inp}>
                    <option>Asignación</option>
                    <option>Préstamo</option>
                    <option>Devolución</option>
                  </select>
                </div>
              </div>

              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-1 border-b pt-2">Firmas y pie</p>
              <div>
                <label className={label}>Entregado por</label>
                <input value={d.entregado_por} onChange={e => set({ entregado_por: e.target.value })} className={inp} placeholder="Nombre de quien entrega" />
              </div>
              <div>
                <label className={label}>Observaciones</label>
                <textarea value={d.observaciones} onChange={e => set({ observaciones: e.target.value })}
                  rows={2} className={`${inp} resize-none`} />
              </div>
              <div>
                <label className={label}>Texto legal</label>
                <textarea value={d.texto_legal} onChange={e => set({ texto_legal: e.target.value })}
                  rows={4} className={`${inp} resize-none`} />
              </div>
            </div>

            {/* RIGHT: Live preview */}
            <div className="overflow-y-auto p-5 bg-slate-50">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Vista previa en tiempo real</p>
              <div
                className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm"
                style={{ fontFamily: 'Arial, sans-serif', fontSize: '9pt', color: '#000', lineHeight: 1.4 }}
                dangerouslySetInnerHTML={{ __html: buildPreviewHtml(d) }}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 flex-shrink-0">
            <button onClick={onClose} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">
              Cancelar
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 text-sm border border-green-300 bg-green-50 text-green-700 rounded-lg hover:bg-green-100"
            >
              <Printer size={14} /> Imprimir / PDF
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !d.nombre.trim()}
              className="px-4 py-2 text-sm bg-primary-500 text-primary-800 font-bold rounded-lg hover:bg-primary-600 disabled:opacity-60"
            >
              {saving ? 'Guardando...' : editId ? 'Actualizar' : 'Guardar copia'}
            </button>
          </div>
        </div>
      </div>

      {/* Hidden print target */}
      <div ref={printRef} id="responsiva-print" className="hidden" />
    </>
  )
}
