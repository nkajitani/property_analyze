# フロントエンド詳細設計書

**プロジェクト**: Real Estate Insight (REI)
**バージョン**: 1.0.0
**作成日**: 2026-04-27
**担当フェーズ**: システム詳細設計 — designer

---

## 1. 技術スタック

| 要素 | 技術 | 備考 |
|------|------|------|
| フレームワーク | Next.js 15 (App Router) | Turbopack 使用 |
| 言語 | TypeScript（strict モード） | `any` 型禁止 |
| ランタイム | Bun | パッケージ管理・スクリプト実行 |
| マップ | react-map-gl (MapLibre) + maplibre-gl | Carto Dark Matter タイル |
| チャート | recharts | 折れ線グラフ |
| スタイル | Inline style のみ | Tailwind クラス記述禁止 |

---

## 2. ディレクトリ構成

```
frontend/
├── app/
│   ├── layout.tsx                # AppShell（Server Component）
│   ├── page.tsx                  # / → <Dashboard />
│   ├── divergence/
│   │   └── page.tsx              # /divergence → <DivergencePage />（新規）
│   └── globals.css
├── src/
│   ├── components/
│   │   ├── NavLinks.tsx          # ← /divergence リンクを追加
│   │   ├── ChangeRateCard.tsx
│   │   ├── ChangeRateCardGrid.tsx
│   │   ├── LandPriceMap.tsx
│   │   ├── TransactionChart.tsx  # 新規
│   │   └── DivergenceMap.tsx     # 新規
│   ├── pages/
│   │   ├── Dashboard.tsx         # 既存・変更なし
│   │   └── DivergencePage.tsx    # 新規
│   ├── api/
│   │   ├── landPrices.ts
│   │   ├── transactions.ts       # 新規
│   │   └── divergence.ts         # 新規
│   ├── types/
│   │   ├── landPrice.ts
│   │   ├── transaction.ts        # 新規
│   │   └── divergence.ts         # 新規
│   └── utils/
│       ├── calcChangeRate.ts
│       └── formatters.ts         # 新規
├── public/
│   ├── mock/city_annual_summary.json
│   └── geo/municipalities.geojson
└── next.config.ts
```

---

## 3. ルーティング設計

| パス | コンポーネント | 概要 |
|------|--------------|------|
| `/` | `Dashboard` | 地価公示推移・前年比変化率カード・マップ（既存） |
| `/divergence` | `DivergencePage` | 地価公示と取引価格の乖離幅マップ・チャート（新規） |

---

## 4. 型定義

### `types/transaction.ts`（新規）

```typescript
export interface TransactionCityAnnualSummary {
  city_code: string;
  city_name: string;
  prefecture_name: string;
  year: number;
  quarter: number | null;
  avg_price_per_sqm: number;
  min_price_per_sqm: number;
  max_price_per_sqm: number;
  avg_trade_price: number;
  record_count: number;
}
```

### `types/divergence.ts`（新規）

```typescript
export interface CityPriceDivergence {
  city_code: string;
  city_name: string;
  prefecture_name: string;
  year: number;
  avg_published_price: number;
  avg_transaction_price: number;
  divergence_rate: number;  // 正 = 取引価格 > 公示地価（%）
  published_count: number;
  transaction_count: number;
}
```

---

## 5. API クライアント

### `api/transactions.ts`（新規）

```typescript
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
```

### `api/divergence.ts`（新規）

```typescript
import type { CityPriceDivergence } from '@/types/divergence';

interface FetchDivergenceParams {
  prefecture_code?: string;
  city_code?: string;
  year_from?: number;
  year_to?: number;
}

export async function fetchDivergence(
  params: FetchDivergenceParams
): Promise<CityPriceDivergence[]> {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined) query.set(k, String(v));
  });
  const res = await fetch(`/api/v1/divergence/cities?${query}`);
  if (!res.ok) throw new Error(`divergence fetch failed: ${res.status}`);
  return res.json() as Promise<CityPriceDivergence[]>;
}
```

---

## 6. ユーティリティ

### `utils/formatters.ts`（新規）

```typescript
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
```

---

## 7. コンポーネント設計

### `NavLinks.tsx`（既存・`/divergence` リンク追加）

```typescript
const links = [
  { href: '/',           label: '地価公示' },
  { href: '/divergence', label: '乖離幅分析' },
];
```

### `DivergenceMap.tsx`（新規）

**Props**:
```typescript
interface Props {
  divergences: CityPriceDivergence[];
  selectedYear: number;
}
```

**乖離率カラースケール**:

| `divergence_rate` | 色 | 説明 |
|------------------|----|------|
| > 20% | `#ef4444` | 大幅割高 |
| 10〜20% | `#f97316` | 割高 |
| -10〜10% | `#94a3b8` | 概ね均衡 |
| -20〜-10% | `#60a5fa` | 割安 |
| < -20% | `#3b82f6` | 大幅割安 |
| データなし | `#334155` | グレー |

```typescript
function getDivergenceColor(rate: number | undefined): string {
  if (rate === undefined) return '#334155';
  if (rate > 20)  return '#ef4444';
  if (rate > 10)  return '#f97316';
  if (rate > -10) return '#94a3b8';
  if (rate > -20) return '#60a5fa';
  return '#3b82f6';
}
```

ツールチップ: 市区町村名・乖離率・公示平均地価・取引平均地価を表示。

### `DivergencePage.tsx`（新規）

```typescript
'use client';

const [divergences, setDivergences] = useState<CityPriceDivergence[]>([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
const [prefCode, setPrefCode] = useState<string>('13');
const [selectedYear, setSelectedYear] = useState<number>(2024);

// 選択年度でフィルタ
const filteredByYear = useMemo(
  () => divergences.filter((d) => d.year === selectedYear),
  [divergences, selectedYear]
);
```

**構成**:
1. ページヘッダー（タイトル + 説明文）
2. フィルター行（都道府県コード入力）
3. 年度セレクター（ボタン式）
4. サマリーカード×2（最大乖離率・最小乖離率エリア）
5. `DivergenceMap`
6. 全年度推移の折れ線グラフ（recharts）

---

## 8. コンポーネント依存グラフ

```
app/layout.tsx (Server)
  └── src/components/NavLinks.tsx ('use client')

app/page.tsx (Server)
  └── src/pages/Dashboard.tsx ('use client')
        ├── src/components/ChangeRateCardGrid.tsx
        ├── src/components/LandPriceMap.tsx
        ├── src/api/landPrices.ts
        └── src/utils/calcChangeRate.ts

app/divergence/page.tsx (Server)
  └── src/pages/DivergencePage.tsx ('use client')
        ├── src/components/DivergenceMap.tsx ('use client')
        ├── src/api/divergence.ts
        ├── src/types/divergence.ts
        └── src/utils/formatters.ts
```

---

## 9. スタイルガイド

| 用途 | カラーコード |
|------|-----------|
| 背景 | `#060d1f` |
| テキスト（プライマリ） | `#f1f5f9` |
| テキスト（セカンダリ） | `#94a3b8` |
| アクセント（青） | `#38bdf8` |
| 上昇 | `#34d399` |
| 下降 | `#f87171` |
| ボーダー | `rgba(255,255,255,0.07)` |
| カード背景 | `rgba(255,255,255,0.03)` |

---

## 10. 実装上の注意事項

- hooks を使用するすべてのコンポーネントにファイル先頭 1 行目で `'use client';` を付与する
- `any` 型は禁止。`fetch().json()` の型アサーションは `as Promise<T>` を使用する
- recharts の Tooltip payload は明示的なインターフェースで型付けする
- `app/layout.tsx`・`app/page.tsx`・`app/divergence/page.tsx` は Server Component として保持する
