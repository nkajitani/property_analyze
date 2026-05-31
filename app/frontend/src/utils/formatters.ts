export function formatPrice(pricePerSqm: number): string {
  if (pricePerSqm >= 10_000) {
    return `${(pricePerSqm / 10_000).toFixed(1)}万円/㎡`;
  }
  return `${pricePerSqm.toLocaleString()}円/㎡`;
}

export function formatChangeRate(rate: number | null): string {
  if (rate === null) return '—';
  const sign = rate >= 0 ? '+' : '';
  const arrow = rate >= 0 ? '▲' : '▼';
  return `${sign}${rate.toFixed(1)}% ${arrow}`;
}

export function formatDivergenceRate(rate: number): string {
  const sign = rate >= 0 ? '+' : '';
  const label = rate >= 0 ? '（割高）' : '（割安）';
  return `${sign}${rate.toFixed(1)}%${label}`;
}
