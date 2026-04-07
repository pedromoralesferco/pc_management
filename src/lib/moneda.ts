export const PAIS_MONEDA: Record<string, { simbolo: string; locale: string }> = {
  'Guatemala':   { simbolo: 'Q',    locale: 'es-GT' },
  'México':      { simbolo: '$',    locale: 'es-MX' },
  'Honduras':    { simbolo: 'L',    locale: 'es-HN' },
  'El Salvador': { simbolo: '$',    locale: 'es-SV' },
  'Nicaragua':   { simbolo: 'C$',   locale: 'es-NI' },
  'Costa Rica':  { simbolo: '₡',    locale: 'es-CR' },
  'Panamá':      { simbolo: 'B/.', locale: 'es-PA' },
}

export function monedaDePais(pais: string | null | undefined): { simbolo: string; locale: string } {
  return PAIS_MONEDA[pais ?? ''] ?? { simbolo: 'Q', locale: 'es-GT' }
}

export function formatMoneda(valor: number | null | undefined, pais: string | null | undefined): string {
  if (!valor) return '—'
  const { simbolo, locale } = monedaDePais(pais)
  return `${simbolo} ${Number(valor).toLocaleString(locale, { minimumFractionDigits: 2 })}`
}
