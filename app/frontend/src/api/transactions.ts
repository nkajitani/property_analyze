import type { TransactionCityAnnualSummary } from '@/types/transaction';

interface FetchTransactionParams {
  prefecture_code?: string;
  city_code?: string;
  year_from?: number;
  year_to?: number;
  transaction_type?: string;
  aggregate_by?: 'annual' | 'quarterly';
}

export async function fetchTransactionSummary(
  params: FetchTransactionParams
): Promise<TransactionCityAnnualSummary[]> {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined) query.set(k, String(v));
  });
  const res = await fetch(`/api/v1/transactions/summary/cities?${query}`);
  if (!res.ok) throw new Error(`transactions fetch failed: ${res.status}`);
  return res.json() as Promise<TransactionCityAnnualSummary[]>;
}
