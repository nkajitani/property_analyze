# ダッシュボード詳細設計

## 1. 概要

| 項目 | 内容 |
|------|------|
| ページパス | `/` |
| コンポーネントファイル | `frontend/src/pages/Dashboard.tsx` |
| 目的 | 一都三県（東京・神奈川・埼玉・千葉）の市区町村ごとの地価前年比変化率を数値カード形式で表示する |
| データソース | モックJSONファイル（APIキー取得後に実APIへ切り替え） |

---

## 2. モックデータ設計

### 2.1 JSONファイルパス

```
frontend/public/mock/city_annual_summary.json
```

`public/` 配下に配置する理由：
- ビルドツール（Vite）のバンドル対象外となり、`fetch('/mock/city_annual_summary.json')` のようなURLでそのまま取得できる
- JSONが大きくなっても JS バンドルサイズに影響しない
- 将来的にAPIへ切り替える際、`fetch` の向き先URLを変更するだけで済む（インポートパスの変更が不要）

### 2.2 JSONの構造

ファイルは `CityAnnualSummary` の配列形式とする。同一の `city_code` について複数年（最低2年分）のレコードを含めることで前年比計算を可能にする。

```typescript
// frontend/src/types/landPrice.ts の CityAnnualSummary と一致させること
interface CityAnnualSummary {
  city_code: string;          // 市区町村コード（5桁）
  city_name: string;          // 市区町村名
  prefecture_name: string;    // 都道府県名
  year: number;               // 調査年（西暦）
  avg_price_per_sqm: number;  // 平均地価（円/㎡）
  min_price_per_sqm: number;  // 最低地価（円/㎡）
  max_price_per_sqm: number;  // 最高地価（円/㎡）
  record_count: number;       // 集計に使用したレコード数
}
```

### 2.3 対象市区町村一覧（モックデータ収録対象）

一都三県から代表的な14市区町村を選定する。

| # | city_code | city_name | prefecture_name | 備考 |
|---|-----------|-----------|-----------------|------|
| 1 | 13101 | 千代田区 | 東京都 | 都心、最高値帯 |
| 2 | 13104 | 新宿区 | 東京都 | 副都心 |
| 3 | 13109 | 品川区 | 東京都 | 再開発エリア |
| 4 | 13113 | 渋谷区 | 東京都 | 商業・住宅混在 |
| 5 | 13120 | 板橋区 | 東京都 | 住宅地 |
| 6 | 13201 | 八王子市 | 東京都 | 郊外 |
| 7 | 14100 | 横浜市 | 神奈川県 | 政令市 |
| 8 | 14130 | 川崎市 | 神奈川県 | 工業・住宅混在 |
| 9 | 14201 | 相模原市 | 神奈川県 | 郊外 |
| 10 | 11100 | さいたま市 | 埼玉県 | 政令市 |
| 11 | 11201 | 川越市 | 埼玉県 | 城下町 |
| 12 | 12100 | 千葉市 | 千葉県 | 政令市 |
| 13 | 12204 | 船橋市 | 千葉県 | 住宅・商業 |
| 14 | 12217 | 柏市 | 千葉県 | 住宅地 |

### 2.4 収録年度

2022年・2023年・2024年の3年分を収録する。
- 前年比計算に最低2年分（2023・2024）が必要
- 3年分収録することで既存の折れ線グラフ機能（`Dashboard.tsx` の `LineChart`）でも有意なデータが表示される

### 2.5 前年比変化率の計算場所

**フロントエンド側で計算する。**

理由：
- バックエンドの `/summary/cities` エンドポイントは `CityAnnualSummary[]` を年次ごとに返す設計であり、既存のインターフェースを変更せずに済む
- モックJSONでも本番APIでも同一のフロント計算ロジックを共用できる
- 前年比は純粋な算術演算であり、フロントへの負荷は極小

計算式：

```
変化率(%) = ((当年avg_price_per_sqm - 前年avg_price_per_sqm) / 前年avg_price_per_sqm) × 100
```

前年データが存在しない場合は変化率を `null` として「データなし（`—`）」を表示する。

---

## 3. APIエンドポイント設計

### 3.1 フロントエンドが呼ぶエンドポイント

#### 3.1.1 開発フェーズ（モック）

```
GET /mock/city_annual_summary.json
```

| 項目 | 内容 |
|------|------|
| メソッド | GET |
| ホスト | Viteの静的ファイルサーバー（`http://localhost:5173`） |
| レスポンス形式 | `CityAnnualSummary[]`（JSON配列） |
| クエリパラメータ | なし（全件取得、フィルタはフロントで実施） |

モックJSON取得用APIクライアント関数（`frontend/src/api/landPrices.ts` に追加）：

```typescript
export async function fetchMockCityAnnualSummary(): Promise<CityAnnualSummary[]> {
  const res = await fetch('/mock/city_annual_summary.json');
  if (!res.ok) throw new Error('モックデータの取得に失敗しました');
  return res.json() as Promise<CityAnnualSummary[]>;
}
```

#### 3.1.2 本番移行後（参考）

```
GET /api/v1/land-prices/summary/cities?prefecture_code={code}
```

既存の `fetchCityAnnualSummary` 関数をそのまま使用する。

### 3.2 フィルタリング仕様

モックデータは全市区町村を含むため、フロントエンド側で都道府県コードによるフィルタを行う。

```typescript
// prefecture_code が指定された場合のフィルタロジック（フロントエンド）
const PREFECTURE_CODE_MAP: Record<string, string> = {
  '11': '埼玉県',
  '12': '千葉県',
  '13': '東京都',
  '14': '神奈川県',
};

function filterByPrefectureCode(
  summaries: CityAnnualSummary[],
  prefCode: string
): CityAnnualSummary[] {
  if (!prefCode) return summaries;
  const prefName = PREFECTURE_CODE_MAP[prefCode];
  return prefName ? summaries.filter(s => s.prefecture_name === prefName) : [];
}
```

---

## 4. 前年比変化率の計算ロジック

### 4.1 計算結果の型定義

`frontend/src/types/landPrice.ts` に以下を追加する。

```typescript
export interface CityChangeRate {
  city_code: string;
  city_name: string;
  prefecture_name: string;
  latestYear: number;
  avgPricePerSqm: number;       // 最新年の平均地価（円/㎡）
  changeRate: number | null;    // 前年比変化率（%）。前年データなしの場合は null
}
```

### 4.2 計算関数

```typescript
// frontend/src/utils/calcChangeRate.ts に実装
export function calcCityChangeRates(
  summaries: CityAnnualSummary[]
): CityChangeRate[] {
  // city_code ごとにグループ化し、年度順にソート
  const grouped = new Map<string, CityAnnualSummary[]>();
  for (const s of summaries) {
    const arr = grouped.get(s.city_code) ?? [];
    arr.push(s);
    grouped.set(s.city_code, arr);
  }

  const results: CityChangeRate[] = [];
  for (const [city_code, records] of grouped) {
    const sorted = records.sort((a, b) => a.year - b.year);
    const latest = sorted[sorted.length - 1];
    const prev = sorted[sorted.length - 2];

    const changeRate = prev
      ? ((latest.avg_price_per_sqm - prev.avg_price_per_sqm) / prev.avg_price_per_sqm) * 100
      : null;

    results.push({
      city_code,
      city_name: latest.city_name,
      prefecture_name: latest.prefecture_name,
      latestYear: latest.year,
      avgPricePerSqm: Math.round(latest.avg_price_per_sqm),
      changeRate: changeRate !== null ? Math.round(changeRate * 10) / 10 : null,
    });
  }

  return results.sort((a, b) => (b.changeRate ?? -Infinity) - (a.changeRate ?? -Infinity));
}
```

---

## 5. UIコンポーネント設計

### 5.1 コンポーネント構成ツリー

```
Dashboard (pages/Dashboard.tsx)
├── DashboardHeader
├── PrefectureFilter
├── SummaryStatCards（既存 StatCard × 3）
├── ChangeRateCardGrid                  ← 新規追加
│   └── ChangeRateCard × N（市区町村数分）
└── LandPriceTrendChart（既存 LineChart エリア）
```

### 5.2 各コンポーネントの責務とProps型定義

#### 5.2.1 Dashboard（既存・拡張）

`Dashboard.tsx` に以下のstate・ロジックを追加する。

```typescript
// 追加するstate
const [mockSummaries, setMockSummaries] = useState<CityAnnualSummary[]>([]);
const [mockLoading, setMockLoading] = useState(true);
const [mockError, setMockError] = useState<string | null>(null);

// 追加するuseMemo
const changeRates = useMemo(
  () => calcCityChangeRates(filteredSummaries),
  [filteredSummaries]
);
```

#### 5.2.2 ChangeRateCardGrid（新規）

```typescript
// frontend/src/components/ChangeRateCardGrid.tsx
interface ChangeRateCardGridProps {
  changeRates: CityChangeRate[];
  loading: boolean;
}
```

責務：
- `loading=true` の間はスケルトンカードを表示（6枚固定）
- `changeRates` を受け取り、`ChangeRateCard` を並べるグリッドコンテナ

#### 5.2.3 ChangeRateCard（新規）

```typescript
// frontend/src/components/ChangeRateCard.tsx
interface ChangeRateCardProps {
  cityName: string;
  prefectureName: string;
  latestYear: number;
  avgPricePerSqm: number;
  changeRate: number | null;
}
```

責務：
- 市区町村名・都道府県名・変化率・平均地価を表示
- `changeRate` の値に応じて配色を切り替える（後述のカラー仕様を参照）

---

### 5.3 ChangeRateCard レイアウト仕様

```
┌────────────────────────────────────┐
│ 上部アクセントライン（2px）         │  ← 変化率に応じた色
│                                    │
│  [都道府県名]        [year]年       │  ← 10px グレー
│  [市区町村名]                       │  ← 18px 太字 白
│                                    │
│  前年比変化率                       │  ← 10px ラベル
│  +3.2%  ▲                         │  ← 28px 太字 変化率カラー
│                                    │
│  平均地価  123,456 円/㎡            │  ← 11px グレー + 数値
└────────────────────────────────────┘
```

カードサイズ：
- 最小幅: 220px（`minWidth: '220px'`）
- パディング: 上下20px・左右22px
- 角丸: `border-radius: 16px`

#### 変化率表示フォーマット

| 条件 | 表示例 |
|------|--------|
| `changeRate > 0` | `+3.2% ▲` |
| `changeRate < 0` | `-1.5% ▼` |
| `changeRate === 0` | `0.0%` |
| `changeRate === null` | `— （前年データなし）` |

---

### 5.4 グリッドレイアウト仕様

```css
/* ChangeRateCardGrid のコンテナスタイル */
display: grid;
grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
gap: 14px;
```

レスポンシブ挙動（参考）：

| ビューポート幅 | 列数（目安） |
|--------------|------------|
| ~480px | 1列 |
| 481px~720px | 2列 |
| 721px~960px | 3列 |
| 961px~1200px | 4列 |
| 1200px~ | 5〜6列 |

---

### 5.5 カラー仕様

既存の `App.tsx` のダークテーマ（背景: `#060d1f`）に合わせる。

#### 変化率カード配色

| 状態 | アクセントカラー | テキストカラー | 背景（通常） | 背景（ホバー） |
|------|----------------|--------------|------------|--------------|
| 上昇（> 0） | `#34d399`（エメラルドグリーン） | `#34d399` | `rgba(52,211,153,0.05)` | `rgba(52,211,153,0.09)` |
| 下降（< 0） | `#f87171`（ソフトレッド） | `#f87171` | `rgba(248,113,113,0.05)` | `rgba(248,113,113,0.09)` |
| 変化なし（= 0） | `#94a3b8`（グレー） | `#94a3b8` | `rgba(255,255,255,0.03)` | `rgba(255,255,255,0.06)` |
| データなし（null） | `#334155`（ダークグレー） | `#334155` | `rgba(255,255,255,0.02)` | `rgba(255,255,255,0.04)` |

ボーダーカラー（通常）：アクセントカラーに透明度 `30` を付与（例: `rgba(52,211,153,0.3)`）

#### 共通テキストカラー（既存と統一）

| 用途 | カラー |
|------|--------|
| 主要テキスト | `#f1f5f9` |
| 副テキスト | `#94a3b8` |
| ラベル・補足 | `#475569` |
| 非アクティブ | `#334155` |

---

## 6. データフロー

### 6.1 ダッシュボード初期表示のフロー

```
[Dashboard マウント]
        │
        ▼
[fetchMockCityAnnualSummary()]
  fetch('/mock/city_annual_summary.json')
        │
        ├── 成功 → setMockSummaries(data)
        └── 失敗 → setMockError(message)
        │
        ▼
[都道府県フィルタ適用]
  filterByPrefectureCode(mockSummaries, prefCode)
        │
        ▼
[calcCityChangeRates(filteredSummaries)]
  city_code ごとにグループ化
  → 前年比変化率を算出
  → CityChangeRate[] を返す
        │
        ▼
[ChangeRateCardGrid へ changeRates を渡す]
        │
        ▼
[ChangeRateCard × N をレンダリング]
  変化率に応じた色で数値カードを表示
```

### 6.2 都道府県フィルタ変更時のフロー

```
[PrefectureFilter で都道府県コード変更]
        │
        ▼
[setPrefCode(code)]  ← stateを更新
        │
        ▼
[useMemo 再計算]
  filterByPrefectureCode → calcCityChangeRates
        │
        ▼
[ChangeRateCardGrid 再レンダリング]
  フィルタ済みのカードを表示
```

注: フィルタ変更時は再フェッチしない（フロントエンド側のメモリ内フィルタのみ）。

### 6.3 ステート管理の全体図

```
Dashboard
├── mockSummaries: CityAnnualSummary[]   ← 全件キャッシュ（初回フェッチのみ）
├── mockLoading: boolean
├── mockError: string | null
├── prefCode: string                     ← 都道府県コードフィルタ（'11'〜'14'）
│
├── [useMemo] filteredSummaries          ← prefCodeでフィルタ済み
├── [useMemo] changeRates: CityChangeRate[]  ← 前年比計算済み
├── [useMemo] stats                      ← 集計サマリ（既存ロジックを流用）
└── [useMemo] chartData                  ← LineChart用データ（既存ロジックを流用）
```

---

## 7. ファイル構成（新規追加・変更対象）

```
frontend/
├── public/
│   └── mock/
│       └── city_annual_summary.json         ← 新規（モックデータ）
├── src/
│   ├── api/
│   │   └── landPrices.ts                    ← fetchMockCityAnnualSummary を追加
│   ├── components/
│   │   ├── ChangeRateCard.tsx               ← 新規
│   │   └── ChangeRateCardGrid.tsx           ← 新規
│   ├── pages/
│   │   └── Dashboard.tsx                   ← 既存を拡張（ChangeRateCardGrid を組み込む）
│   ├── types/
│   │   └── landPrice.ts                    ← CityChangeRate 型を追加
│   └── utils/
│       └── calcChangeRate.ts               ← 新規（前年比計算ロジック）
```

---

## 8. エラー・ローディング状態の仕様

| 状態 | ChangeRateCardGrid の表示 |
|------|--------------------------|
| `loading=true` | スケルトンカード6枚（shimmerアニメーション） |
| `error != null` | 既存のエラーバナー（赤背景・アイコン付き）を流用 |
| `changeRates.length === 0` | 既存の `EmptyState` コンポーネントを流用 |
| 正常 | `ChangeRateCard` を変化率降順で表示 |

スケルトンカードの仕様：

```typescript
function SkeletonChangeRateCard() {
  return (
    <div
      className="shimmer"
      style={{
        borderRadius: '16px',
        height: '120px',
        border: '1px solid rgba(255,255,255,0.05)',
        background: 'rgba(255,255,255,0.02)',
      }}
    />
  );
}
```

---

## 9. アクセシビリティ仕様

| 項目 | 対応内容 |
|------|---------|
| カラーのみに依存しない情報伝達 | 上昇には `▲`、下降には `▼` の記号を併記する |
| スクリーンリーダー対応 | `aria-label` に「{市区町村名} 前年比 {変化率}%」を設定する |
| キーボード操作 | 都道府県フィルタのEnterキー送信（既存実装を流用） |
