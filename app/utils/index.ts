export const receiptCategories = [
  { label: 'Plugin Sales', value: 'Plugin Sales' },
  { label: 'Development Leistung', value: 'Development Leistung' },
  { label: 'Internet & Telefon', value: 'Internet & Telefon' },
  { label: 'Software & Subscriptions', value: 'Software & Subscriptions' },
  { label: 'Hardware', value: 'Hardware' },
  { label: 'Fortbildung', value: 'Fortbildung' },
  { label: 'Bewirtung', value: 'Bewirtung' },
  { label: 'Steuerberatung', value: 'Steuerberatung' },
  { label: 'Versicherungen', value: 'Versicherungen' },
  { label: 'Sonstige', value: 'Sonstige' }
]

export function getErrorMessage(error: unknown, fallback = 'Ein Fehler ist aufgetreten'): string {
  if (error && typeof error === 'object' && 'data' in error) {
    const { data } = error as { data?: { message?: string } }
    if (typeof data?.message === 'string') return data.message
  }
  if (error instanceof Error) return error.message
  return fallback
}
