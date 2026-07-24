export const money = (value: number, currency: 'EUR' = 'EUR') =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value)
