export function normalizeApiDate(value?: string | null): string | undefined {
  if (!value) return undefined
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return undefined
  return date.toISOString()
}

export function formatDate(value?: string): string {
  if (!value) return 'Date non communiquée'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Date non communiquée'
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(date)
}
