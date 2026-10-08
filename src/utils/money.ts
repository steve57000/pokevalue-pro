export const money = (value: number, currency: 'EUR' = 'EUR') => {
  // Normalize to cents first so floating point sums such as 0.1 + 0.2
  // still render as a clean currency amount.
  const rounded = Math.round((value + Math.sign(value) * Number.EPSILON) * 100) / 100
  const fractionDigits = Number.isInteger(rounded) ? 0 : 2

  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: 2,
  }).format(rounded)
}
