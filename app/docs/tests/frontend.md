# フロントエンド テスト仕様書

**プロジェクト**: Real Estate Insight (REI)
**バージョン**: 1.0.0
**作成日**: 2026-04-27
**担当フェーズ**: テスト設計 — test-planner
**参照設計書**: `docs/designs/frontend.md`, `docs/requirements/strategy.md`

---

## 1. テスト方針

### 1.1 対象スコープ

| 対象 | テスト種別 |
|------|----------|
| `utils/calcChangeRate.ts` | 単体テスト |
| `utils/formatters.ts` | 単体テスト |
| `api/landPrices.ts` | 単体テスト（fetch モック） |
| `api/transactions.ts` | 単体テスト（fetch モック） |
| `api/divergence.ts` | 単体テスト（fetch モック） |
| `components/ChangeRateCard.tsx` | コンポーネントテスト |
| `components/DivergenceMap.tsx`（`getDivergenceColor`） | 単体テスト |
| `pages/DivergencePage.tsx` | コンポーネントテスト |
| TypeScript 型安全性 | `tsc --noEmit` |

### 1.2 テストフレームワーク・ツール

- **Bun test**（テストランナー）
- **@testing-library/react**（コンポーネントテスト）
- **jsdom**（ブラウザ環境シミュレーション）
- `fetch` は `globalThis.fetch` をモック置換

### 1.3 方針

- `any` 型を使用するテストコードは禁止
- MapLibre GL / react-map-gl は必ずモック化する（jsdom 非対応）
- Server Component（`app/layout.tsx`, `app/page.tsx` 等）はテスト対象外

---

## 2. 単体テスト — `utils/calcChangeRate.ts`

| テスト ID | テストケース | 入力 | 期待結果 |
|----------|------------|------|---------|
| FE-CALC-01 | 空配列 | `summaries = []` | `[]` を返す |
| FE-CALC-02 | 1 都市・1 年（前年データなし） | 1 件のみ | `changeRate: null` |
| FE-CALC-03 | 正変化率 | 前年 avg=100, 今年 avg=120 | `changeRate: 20.0` |
| FE-CALC-04 | 負変化率 | 前年 avg=100, 今年 avg=80 | `changeRate: -20.0` |
| FE-CALC-05 | 変化率の丸め | 前年=100, 今年=110.23 | `changeRate: 10.2` |
| FE-CALC-06 | 複数都市を個別に計算 | 2 都市 × 2 年それぞれ | 各都市の変化率が独立して計算される |
| FE-CALC-07 | 降順ソート（changeRate 降順） | 変化率が +10, +5, -3 の 3 都市 | `+10, +5, -3` の順で返す |
| FE-CALC-08 | `changeRate: null` のソート位置 | null 含む混在 | null を末尾に配置 |
| FE-CALC-09 | 3 年以上ある場合に最新 2 年を使用 | 1 都市 × 3 年 | 最新年と 2 番目に新しい年の差で計算 |
| FE-CALC-10 | 年度が逆順で渡されても正しく計算 | 年度が逆順 | 年度ソート後に変化率計算 |
| FE-CALC-11 | `latestYear` が最新年 | 3 年分データ | `latestYear` が最大の年 |

---

## 3. 単体テスト — `utils/formatters.ts`

### `formatPrice`

| テスト ID | テストケース | 入力 | 期待結果 |
|----------|------------|------|---------|
| FE-FMT-01 | 10,000 円（境界値） | `10000` | `"1.0万円/㎡"` |
| FE-FMT-02 | 9,999 円（境界値-1） | `9999` | `"9,999円/㎡"` |
| FE-FMT-03 | 1,000,000 円 | `1000000` | `"100.0万円/㎡"` |
| FE-FMT-04 | 5,000 円 | `5000` | `"5,000円/㎡"` |

### `formatChangeRate`

| テスト ID | テストケース | 入力 | 期待結果 |
|----------|------------|------|---------|
| FE-FMT-05 | null 入力 | `null` | `"—"` |
| FE-FMT-06 | 正の変化率 | `5.3` | `"+5.3% ▲"` |
| FE-FMT-07 | 負の変化率 | `-3.2` | `"-3.2% ▼"` |
| FE-FMT-08 | 0.0 | `0.0` | `"+0.0% ▲"` |

### `formatDivergenceRate`

| テスト ID | テストケース | 入力 | 期待結果 |
|----------|------------|------|---------|
| FE-FMT-09 | 正の乖離率 | `25.0` | `"+25.0%（割高）"` |
| FE-FMT-10 | 負の乖離率 | `-12.5` | `"-12.5%（割安）"` |
| FE-FMT-11 | 0.0 | `0.0` | `"+0.0%（割高）"` |

---

## 4. 単体テスト — `getDivergenceColor`（カラースケール境界値）

| テスト ID | 入力 (`rate`) | 期待色 |
|----------|-------------|------|
| FE-COLOR-01 | `undefined` | `'#334155'` |
| FE-COLOR-02 | `20.01`（大幅割高） | `'#ef4444'` |
| FE-COLOR-03 | `20.0`（境界値） | `'#f97316'`（`> 20` は false） |
| FE-COLOR-04 | `10.01`（割高） | `'#f97316'` |
| FE-COLOR-05 | `10.0`（境界値） | `'#94a3b8'` |
| FE-COLOR-06 | `0.0`（均衡） | `'#94a3b8'` |
| FE-COLOR-07 | `-10.0`（境界値） | `'#60a5fa'` |
| FE-COLOR-08 | `-20.0`（境界値） | `'#3b82f6'` |
| FE-COLOR-09 | `-20.01`（大幅割安） | `'#3b82f6'` |

---

## 5. 単体テスト — API クライアント（fetch モック）

### `api/transactions.ts`

| テスト ID | テストケース | 入力 / モック設定 | 期待結果 |
|----------|------------|----------------|---------|
| FE-API-TX-01 | 正常取得 | HTTP 200 + 有効 JSON | `TransactionCityAnnualSummary[]` を返す |
| FE-API-TX-02 | サーバーエラー | HTTP 404 | `Error` が throw される |
| FE-API-TX-03 | `aggregate_by="quarterly"` がクエリに含まれる | `aggregate_by: 'quarterly'` | URL に `?aggregate_by=quarterly` が含まれる |
| FE-API-TX-04 | `undefined` パラメータはクエリに含まれない | `{ prefecture_code: undefined }` | URL に `prefecture_code` が含まれない |

### `api/divergence.ts`

| テスト ID | テストケース | 入力 / モック設定 | 期待結果 |
|----------|------------|----------------|---------|
| FE-API-DIV-01 | 正常取得 | HTTP 200 + 有効 JSON | `CityPriceDivergence[]` を返す |
| FE-API-DIV-02 | サーバーエラー | HTTP 500 | `Error` が throw される |
| FE-API-DIV-03 | 複数パラメータのクエリ文字列化 | `prefecture_code="14", year_from=2022` | 両パラメータが URL に含まれる |

---

## 6. コンポーネントテスト — `components/ChangeRateCard.tsx`

| テスト ID | テストケース | Props | 期待結果 |
|----------|------------|-------|---------|
| FE-COMP-CARD-01 | 正変化率 | `changeRate: 5.3` | `+5.3%` が表示される |
| FE-COMP-CARD-02 | 負変化率 | `changeRate: -3.2` | `-3.2%` が表示される |
| FE-COMP-CARD-03 | `changeRate: null` | `changeRate: null` | `"—"` が表示される |
| FE-COMP-CARD-04 | 価格の表示 | `avgPricePerSqm: 500000` | `"50.0万円/㎡"` が表示される |

---

## 7. コンポーネントテスト — `pages/DivergencePage.tsx`

MapLibre GL コンポーネントはモックで代替実装を提供すること。

| テスト ID | テストケース | 操作 / 前提 | 期待結果 |
|----------|------------|-----------|---------|
| FE-COMP-DIV-01 | ローディング状態の表示 | fetch が解決前 | ローディングインジケーターが表示される |
| FE-COMP-DIV-02 | データ取得成功後の表示 | fetchDivergence が有効データを返す | マップコンポーネントがレンダリングされる |
| FE-COMP-DIV-03 | エラー状態の表示 | fetchDivergence が reject する | エラーメッセージが表示される |
| FE-COMP-DIV-04 | 都道府県コード入力によるフィルタ | `prefCode` を "14" に変更 | `fetchDivergence` が `prefecture_code: "14"` で呼ばれる |
| FE-COMP-DIV-05 | 年度セレクター変更 | `selectedYear` を 2022 に変更 | `filteredByYear` が 2022 年のデータのみを含む |
| FE-COMP-DIV-06 | サマリーカードの最大乖離率エリア | divergences にデータあり | 最も `divergence_rate` が高い市区町村名が表示される |
| FE-COMP-DIV-07 | サマリーカードの最小乖離率エリア | divergences にデータあり | 最も `divergence_rate` が低い市区町村名が表示される |
| FE-COMP-DIV-08 | 空データ時のサマリーカード | `divergences = []` | エラーなく表示される |
| FE-COMP-DIV-09 | `selectedYear` 変更で再フィルタ | year を変更 | `filteredByYear` が更新される |

---

## 8. TypeScript 型チェック

| テスト ID | テストケース | 確認内容 | 期待結果 |
|----------|------------|---------|---------|
| FE-TYPE-01 | `tsc --noEmit` が通ること | フロントエンド全体 | 型エラーゼロ |
| FE-TYPE-02 | `any` 型が使用されていないこと | `--strict` の `noImplicitAny` | 型エラーゼロ |
| FE-TYPE-03 | `CityPriceDivergence` 型と API レスポンス型の整合性 | `api/divergence.ts` の戻り値 | `CityPriceDivergence[]` として型付けされている |
| FE-TYPE-04 | `TransactionCityAnnualSummary` 型の整合性 | `api/transactions.ts` の戻り値 | `TransactionCityAnnualSummary[]` として型付けされている |

---

## 9. ナビゲーションテスト

| テスト ID | テストケース | 操作 | 期待結果 |
|----------|------------|------|---------|
| FE-NAV-01 | `/divergence` リンクが NavLinks に存在する | `NavLinks` をレンダリング | `href="/divergence"` を持つリンクが存在する |
| FE-NAV-02 | `/` リンクが NavLinks に存在する | `NavLinks` をレンダリング | `href="/"` を持つリンクが存在する |

---

## 10. テスト実装ファイル配置

```
frontend/
└── src/
    └── __tests__/
        ├── utils/
        │   ├── calcChangeRate.test.ts
        │   └── formatters.test.ts
        ├── api/
        │   ├── transactions.test.ts
        │   └── divergence.test.ts
        ├── components/
        │   ├── ChangeRateCard.test.tsx
        │   └── DivergenceMap.getDivergenceColor.test.ts
        └── pages/
            └── DivergencePage.test.tsx
```
