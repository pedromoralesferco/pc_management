export const PAIS_MONEDA: Record<string, { simbolo: string; locale: string }> = {
  'Guatemala':   { simbolo: 'Q',  locale: 'es-GT' },
  'El Salvador': { simbolo: '$',  locale: 'es-SV' },
  'Honduras':    { simbolo: 'L',  locale: 'es-HN' },
  'México':      { simbolo: '$',  locale: 'es-MX' },
}

export const PAISES = Object.keys(PAIS_MONEDA)

export function monedaDePais(pais: string | null | undefined): { simbolo: string; locale: string } {
  return PAIS_MONEDA[pais ?? ''] ?? { simbolo: 'Q', locale: 'es-GT' }
}

export function formatMoneda(valor: number | null | undefined, pais: string | null | undefined): string {
  if (!valor) return '—'
  const { simbolo, locale } = monedaDePais(pais)
  return `${simbolo} ${Number(valor).toLocaleString(locale, { minimumFractionDigits: 2 })}`
}
