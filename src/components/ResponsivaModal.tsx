import { useState, useEffect } from 'react'
import { Printer, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { monedaDePais, formatMoneda } from '../lib/moneda'
import { getConfig } from '../lib/config'
import { getSession } from '../lib/auth'
import type { Usuario, Asignacion, TipoAsignacionResponsiva, EquipoResponsiva, Responsiva } from '../types'

const SUBTITULO = 'Responsiva de Entrega de Equipos'
const TEXTO_LEGAL =
  'Yo, <strong>{nombre}</strong>, habiendo recibido los equipos descritos en este documento, declaro conocer y aceptar las siguientes condiciones de uso:' +
  '<br><br><strong>Me comprometo a:</strong>' +
  '<ul style="margin:4px 0 6px 16px;padding:0;line-height:1.7">' +
  '<li>Utilizar el equipo exclusivamente para actividades laborales.</li>' +
  '<li>Protegerlo de líquidos, golpes, temperaturas extremas y cualquier condición que ponga en riesgo su integridad física.</li>' +
  '<li>Respaldar regularmente mi información crítica en la nube corporativa (OneDrive / Google Drive).</li>' +
  '<li>Notificar de inmediato a soporte técnico cualquier falla, desgaste, avería o necesidad de mantenimiento, así como cualquier caso de pérdida o robo.</li>' +
  '<li>Cerrar sesión y apagar el equipo al finalizar cada jornada laboral.</li>' +
  '</ul>' +
  '<strong>Me abstendré de:</strong>' +
  '<ul style="margin:4px 0 6px 16px;padding:0;line-height:1.7">' +
  '<li>Prestar el equipo a terceros, incluyendo familiares, o permitir su uso para fines personales.</li>' +
  '<li>Instalar software no autorizado, conectar dispositivos USB de origen desconocido o almacenar información personal.</li>' +
  '<li>Realizar modificaciones de hardware ni desactivar herramientas de seguridad (antivirus, firewall).</li>' +
  '<li>Colocar stickers o adhesivos distintos a las etiquetas oficiales de inventario de TI.</li>' +
  '</ul>' +
  '<strong>Responsabilidad por daños:</strong> En caso de daño comprobado por mal uso o negligencia, acepto responder por el costo de reparación o reemplazo del equipo conforme a los criterios establecidos en la Política de Renovación de Equipos de TI. Dicho reintegro se gestionará de mutuo acuerdo entre las partes o, en su defecto, mediante los mecanismos legales aplicables según la legislación laboral vigente en el país donde presto mis servicios, respetando en todo momento los límites y procedimientos que dicha legislación establezca para la protección del salario.'

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
  const session = getSession()
  return {
    empresa: 'FERCO Total Look',       // overwritten by config on mount
    subtitulo: SUBTITULO,
    usuario_id: usuario.id,
    nombre: `${usuario.nombre} ${usuario.apellido}`,
    cargo: usuario.cargo ?? '',
    departamento: usuario.departamento ?? '',
    centro_costo: usuario.centro_costo,
    pais: usuario.pais,
    tipo_asignacion: 'Asignación',
    entregado_por: session?.nombre ?? '',
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
        pais: (a.equipo as any).pais ?? null,
        precio_compra: (a.equipo as any).precio_compra ?? null,
      })),
  }
}

export function buildEditorFromResponsiva(r: Responsiva): EditorData {
  return {
    empresa: 'FERCO Total Look',
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
  const legal = d.texto_legal.replace(/\{nombre\}/g, d.nombre || '_______________')

  const filas = d.equipos.map(e => `
    <tr>
      <td style="border:.5px solid #ccc;padding:4px 6px;text-align:center;font-size:8.5pt">1</td>
      <td style="border:.5px solid #ccc;padding:4px 6px;font-size:8.5pt">${e.marca || '—'}</td>
      <td style="border:.5px solid #ccc;padding:4px 6px;font-size:8.5pt">${e.modelo || '—'}</td>
      <td style="border:.5px solid #ccc;padding:4px 6px;font-family:monospace;font-size:7.5pt">${e.numero_serie || '—'}</td>
      <td style="border:.5px solid #ccc;padding:4px 6px;font-family:monospace;font-size:7.5pt">${e.correlativo_ferco || '—'}</td>
      <td style="border:.5px solid #ccc;padding:4px 6px;font-size:8.5pt">${e.tipo || '—'}</td>
      <td style="border:.5px solid #ccc;padding:4px 6px;text-align:right;font-size:8.5pt">${formatMoneda(e.precio_compra, e.pais)}</td>
    </tr>`).join('')

  const filasPad = d.equipos.length < 3
    ? Array(3 - d.equipos.length).fill(
        `<tr><td style="border:.5px solid #ccc;padding:4px 6px;height:18px" colspan="7"></td></tr>`
      ).join('')
    : ''

  // Total agrupado por moneda del equipo
  const totalesPorPais: Record<string, { simbolo: string; locale: string; total: number }> = {}
  d.equipos.forEach(e => {
    if (!e.precio_compra) return
    const key = e.pais ?? 'Guatemala'
    if (!totalesPorPais[key]) totalesPorPais[key] = { ...monedaDePais(e.pais), total: 0 }
    totalesPorPais[key].total += Number(e.precio_compra)
  })
  const totalFmt = Object.keys(totalesPorPais).length === 0
    ? '—'
    : Object.values(totalesPorPais)
        .map(({ simbolo, locale, total }) =>
          `${simbolo} ${Number(total).toLocaleString(locale, { minimumFractionDigits: 2 })}`
        ).join(' + ')

  return `
    <div style="text-align:center;font-size:12pt;font-weight:700;text-transform:uppercase;
      border-bottom:2.5px solid #000;padding-bottom:4px;margin-bottom:4px">${d.empresa}</div>
    <div style="text-align:center;font-size:8.5pt;color:#333;margin-bottom:10px">${d.subtitulo}</div>

    <div style="font-size:7.5pt;font-weight:700;text-transform:uppercase;background:#e0e0e0;
      padding:3px 7px;border-left:3px solid #555;margin:8px 0 4px">Datos del responsable</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;border:1px solid #aaa;margin-bottom:6px">
      <div style="border:.5px solid #ccc;padding:4px 6px">
        <span style="font-size:7pt;color:#555;display:block">Nombre</span>
        <span style="font-size:9.5pt;font-weight:700;display:block;min-height:14px">${d.nombre || '_______________'}</span>
      </div>
      <div style="border:.5px solid #ccc;padding:4px 6px">
        <span style="font-size:7pt;color:#555;display:block">Cargo / Puesto</span>
        <span style="font-size:9.5pt;font-weight:700;display:block;min-height:14px">${d.cargo || '_______________'}</span>
      </div>
      <div style="border:.5px solid #ccc;padding:4px 6px">
        <span style="font-size:7pt;color:#555;display:block">Departamento</span>
        <span style="font-size:9.5pt;font-weight:700;display:block;min-height:14px">${d.departamento || '_______________'}</span>
      </div>
      <div style="border:.5px solid #ccc;padding:4px 6px">
        <span style="font-size:7pt;color:#555;display:block">Centro de Costo</span>
        <span style="font-size:9.5pt;font-weight:700;display:block;min-height:14px">${d.centro_costo || '_______________'}</span>
      </div>
      <div style="border:.5px solid #ccc;padding:4px 6px">
        <span style="font-size:7pt;color:#555;display:block">País</span>
        <span style="font-size:9.5pt;font-weight:700;display:block;min-height:14px">${d.pais || '_______________'}</span>
      </div>
      <div style="border:.5px solid #ccc;padding:4px 6px">
        <span style="font-size:7pt;color:#555;display:block">Fecha</span>
        <span style="font-size:9.5pt;font-weight:700;display:block;min-height:14px">${d.fecha}</span>
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
        <div style="font-size:8.5pt;color:#000">${d.entregado_por || '_______________'}</div>
        <div style="font-size:7pt;color:#555">Entregado por</div>
      </div>
      <div style="text-align:center">
        <div style="border-top:1px solid #000;margin:28px 10px 4px"></div>
        <div style="font-size:8.5pt;color:#000">${d.nombre || '_______________'}</div>
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
  editId?: string | null
  onSaved?: () => void
}

export default function ResponsivaModal({ open, onClose, data: initialData, editId, onSaved }: Props) {
  const [observaciones, setObservaciones] = useState(initialData.observaciones)
  const [empresa, setEmpresa] = useState(initialData.empresa)
  const [saving, setSaving] = useState(false)


  useEffect(() => {
    setObservaciones(initialData.observaciones)
    getConfig().then(cfg => setEmpresa(cfg.nombre_empresa))
  }, [initialData])

  if (!open) return null

  const d: EditorData = { ...initialData, empresa, observaciones }

  function handlePrint() {
    const html = buildPreviewHtml(d)
    const w = window.open('', '_blank', 'width=820,height=1060')
    if (!w) return
    w.document.write(
      `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Responsiva — ${d.nombre}</title>` +
      `<style>body{font-family:Arial,sans-serif;font-size:10pt;color:#000;padding:10mm 14mm;margin:0}</style></head>` +
      `<body onload="window.focus();window.print()">${html}</body></html>`
    )
    w.document.close()
  }

  async function handleSave() {
    setSaving(true)
    const payload = {
      usuario_id: d.usuario_id,
      nombre: d.nombre,
      cargo: d.cargo || null,
      departamento: d.departamento || null,
      centro_costo: d.centro_costo || null,
      pais: d.pais || null,
      tipo_asignacion: d.tipo_asignacion,
      entregado_por: d.entregado_por || null,
      observaciones: observaciones || null,
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

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto">
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-5xl my-4 flex flex-col">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
            <div>
              <h2 className="text-base font-semibold text-slate-800">Responsiva de entrega</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {d.nombre} · {d.equipos.length} equipo{d.equipos.length !== 1 ? 's' : ''}
              </p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
          </div>

          {/* Body */}
          <div className="grid grid-cols-[260px_1fr] overflow-hidden" style={{ height: '76vh' }}>

            {/* LEFT: resumen + solo observaciones editable */}
            <div className="overflow-y-auto px-5 py-4 border-r border-slate-100 space-y-4 min-h-0">

              {/* Datos del responsable — solo lectura */}
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-1 border-b mb-2">Responsable</p>
                {[
                  ['Nombre',          d.nombre],
                  ['Cargo',           d.cargo || '—'],
                  ['Departamento',    d.departamento || '—'],
                  ['Centro de Costo', d.centro_costo || '—'],
                  ['País',            d.pais || '—'],
                  ['Fecha',           d.fecha],
                  ['Tipo',            d.tipo_asignacion],
                  ['Entregado por',   d.entregado_por || '—'],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between text-xs py-0.5">
                    <span className="text-slate-400">{label}</span>
                    <span className="text-slate-700 font-medium text-right max-w-[150px] truncate">{value}</span>
                  </div>
                ))}
              </div>

              {/* Equipos — solo lectura */}
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-1 border-b mb-2">
                  Equipos ({d.equipos.length})
                </p>
                <div className="space-y-1">
                  {d.equipos.map(e => (
                    <div key={e.id} className="text-xs bg-slate-50 rounded px-2 py-1.5">
                      <p className="font-medium text-slate-700">{e.marca} {e.modelo}</p>
                      <p className="text-slate-400 font-mono">{e.correlativo_ferco} · {formatMoneda(e.precio_compra, e.pais)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Observaciones — ÚNICO campo editable */}
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-1 border-b mb-2">Observaciones</p>
                <textarea
                  value={observaciones}
                  onChange={e => setObservaciones(e.target.value)}
                  rows={5}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  placeholder="Notas, condiciones del equipo, acuerdos especiales..."
                  autoFocus
                />
              </div>
            </div>

            {/* RIGHT: Live preview */}
            <div className="overflow-y-auto p-5 bg-slate-50 min-h-0">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Vista previa</p>
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
              disabled={saving}
              className="px-4 py-2 text-sm bg-primary-500 text-primary-800 font-bold rounded-lg hover:bg-primary-600 disabled:opacity-60"
            >
              {saving ? 'Guardando...' : editId ? 'Actualizar' : 'Guardar copia'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
