export function maskNationalId(value: string): string {
  const trimmed = value.trim()
  if (trimmed.length <= 4) return '••••'
  return `${trimmed.slice(0, 1)}${'•'.repeat(Math.max(trimmed.length - 4, 0))}${trimmed.slice(-3)}`
}

export function maskHealthCardNumber(value: string): string {
  const trimmed = value.trim()
  if (trimmed.length <= 4) return '••••'
  return `${'•'.repeat(trimmed.length - 4)}${trimmed.slice(-4)}`
}
