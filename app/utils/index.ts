export function getErrorMessage(error: unknown, fallback = 'Ein Fehler ist aufgetreten'): string {
  if (error && typeof error === 'object' && 'data' in error) {
    const { data } = error as { data?: { message?: string } }
    if (typeof data?.message === 'string') return data.message
  }
  if (error instanceof Error) return error.message
  return fallback
}
