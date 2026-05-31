# モックデータ仕様書

## 1. 概要

| 項目 | 内容 |
|------|------|
| ファイル名 | `city_annual_summary.json` |
| 配置パス | `frontend/public/mock/city_annual_summary.json` |
| 形式 | JSON配列（`CityAnnualSummary[]`） |
| 収録年度 | 2022・2023・2024年（3年分） |
| 収録市区町村 | 14市区町村 × 3年 = 42レコード |

---

## 2. 配置場所の選定理由

`frontend/public/` 配下に配置する。

| 比較項目 | `public/mock/` | `src/` 内（importして使用） |
|---------|---------------|--------------------------|
| バンドルへの影響 | なし（静的ファイルとして配信） | JSONがJSバンドルに含まれる |
| 取得方法 | `fetch('/mock/city_annual_summary.json')` | `import mockData from './...'` |
| APIへの切り替え容易性 | fetch向き先URLを変えるだけ | import文の削除・差し替えが必要 |
| 大容量対応 | ファイルが大きくなっても問題なし | バンドルサイズ増大リスクあり |
| キャッシュ制御 | HTTPキャッシュが効く | 毎回バンドルに同梱 |

将来的にAPIキーを取得して本番データへ切り替える際、`fetch('/mock/city_annual_summary.json')` を `fetch('/api/v1/land-prices/summary/cities')` に変更するだけで移行できるため `public/` 配下を選択する。

---

## 3. データ型定義（再掲）

```typescript
// frontend/src/types/landPrice.ts の CityAnnualSummary と完全に一致させること
interface CityAnnualSummary {
  city_code: string;          // 市区町村コード（JIS X 0402準拠、5桁）
  city_name: string;          // 市区町村名（漢字）
  prefecture_name: string;    // 都道府県名（「東京都」など末尾の形を含む）
  year: number;               // 調査年（西暦・整数）
  avg_price_per_sqm: number;  // 平均地価（円/㎡・小数可）
  min_price_per_sqm: number;  // 最低地価（円/㎡・整数）
  max_price_per_sqm: number;  // 最高地価（円/㎡・整数）
  record_count: number;       // 集計レコード数（整数）
}
```

---

## 4. モックJSONサンプル（完全版）

以下に `frontend/public/mock/city_annual_summary.json` の完全な内容を示す。地価水準は国土交通省の公示地価を参考にしたダミー値であり、実際の数値とは異なる。

```json
[
  {
    "city_code": "13101",
    "city_name": "千代田区",
    "prefecture_name": "東京都",
    "year": 2022,
    "avg_price_per_sqm": 2350000.0,
    "min_price_per_sqm": 1200000,
    "max_price_per_sqm": 5800000,
    "record_count": 42
  },
  {
    "city_code": "13101",
    "city_name": "千代田区",
    "prefecture_name": "東京都",
    "year": 2023,
    "avg_price_per_sqm": 2480000.0,
    "min_price_per_sqm": 1280000,
    "max_price_per_sqm": 6100000,
    "record_count": 42
  },
  {
    "city_code": "13101",
    "city_name": "千代田区",
    "prefecture_name": "東京都",
    "year": 2024,
    "avg_price_per_sqm": 2610000.0,
    "min_price_per_sqm": 1350000,
    "max_price_per_sqm": 6400000,
    "record_count": 43
  },
  {
    "city_code": "13104",
    "city_name": "新宿区",
    "prefecture_name": "東京都",
    "year": 2022,
    "avg_price_per_sqm": 1180000.0,
    "min_price_per_sqm": 620000,
    "max_price_per_sqm": 3500000,
    "record_count": 58
  },
  {
    "city_code": "13104",
    "city_name": "新宿区",
    "prefecture_name": "東京都",
    "year": 2023,
    "avg_price_per_sqm": 1230000.0,
    "min_price_per_sqm": 650000,
    "max_price_per_sqm": 3680000,
    "record_count": 58
  },
  {
    "city_code": "13104",
    "city_name": "新宿区",
    "prefecture_name": "東京都",
    "year": 2024,
    "avg_price_per_sqm": 1295000.0,
    "min_price_per_sqm": 680000,
    "max_price_per_sqm": 3850000,
    "record_count": 59
  },
  {
    "city_code": "13109",
    "city_name": "品川区",
    "prefecture_name": "東京都",
    "year": 2022,
    "avg_price_per_sqm": 880000.0,
    "min_price_per_sqm": 450000,
    "max_price_per_sqm": 2200000,
    "record_count": 71
  },
  {
    "city_code": "13109",
    "city_name": "品川区",
    "prefecture_name": "東京都",
    "year": 2023,
    "avg_price_per_sqm": 930000.0,
    "min_price_per_sqm": 480000,
    "max_price_per_sqm": 2350000,
    "record_count": 72
  },
  {
    "city_code": "13109",
    "city_name": "品川区",
    "prefecture_name": "東京都",
    "year": 2024,
    "avg_price_per_sqm": 985000.0,
    "min_price_per_sqm": 510000,
    "max_price_per_sqm": 2480000,
    "record_count": 72
  },
  {
    "city_code": "13113",
    "city_name": "渋谷区",
    "prefecture_name": "東京都",
    "year": 2022,
    "avg_price_per_sqm": 1420000.0,
    "min_price_per_sqm": 750000,
    "max_price_per_sqm": 4200000,
    "record_count": 47
  },
  {
    "city_code": "13113",
    "city_name": "渋谷区",
    "prefecture_name": "東京都",
    "year": 2023,
    "avg_price_per_sqm": 1505000.0,
    "min_price_per_sqm": 790000,
    "max_price_per_sqm": 4450000,
    "record_count": 47
  },
  {
    "city_code": "13113",
    "city_name": "渋谷区",
    "prefecture_name": "東京都",
    "year": 2024,
    "avg_price_per_sqm": 1580000.0,
    "min_price_per_sqm": 830000,
    "max_price_per_sqm": 4650000,
    "record_count": 48
  },
  {
    "city_code": "13120",
    "city_name": "板橋区",
    "prefecture_name": "東京都",
    "year": 2022,
    "avg_price_per_sqm": 450000.0,
    "min_price_per_sqm": 280000,
    "max_price_per_sqm": 920000,
    "record_count": 85
  },
  {
    "city_code": "13120",
    "city_name": "板橋区",
    "prefecture_name": "東京都",
    "year": 2023,
    "avg_price_per_sqm": 465000.0,
    "min_price_per_sqm": 290000,
    "max_price_per_sqm": 950000,
    "record_count": 85
  },
  {
    "city_code": "13120",
    "city_name": "板橋区",
    "prefecture_name": "東京都",
    "year": 2024,
    "avg_price_per_sqm": 472000.0,
    "min_price_per_sqm": 295000,
    "max_price_per_sqm": 960000,
    "record_count": 86
  },
  {
    "city_code": "13201",
    "city_name": "八王子市",
    "prefecture_name": "東京都",
    "year": 2022,
    "avg_price_per_sqm": 195000.0,
    "min_price_per_sqm": 80000,
    "max_price_per_sqm": 480000,
    "record_count": 120
  },
  {
    "city_code": "13201",
    "city_name": "八王子市",
    "prefecture_name": "東京都",
    "year": 2023,
    "avg_price_per_sqm": 198000.0,
    "min_price_per_sqm": 82000,
    "max_price_per_sqm": 490000,
    "record_count": 121
  },
  {
    "city_code": "13201",
    "city_name": "八王子市",
    "prefecture_name": "東京都",
    "year": 2024,
    "avg_price_per_sqm": 196000.0,
    "min_price_per_sqm": 81000,
    "max_price_per_sqm": 485000,
    "record_count": 121
  },
  {
    "city_code": "14100",
    "city_name": "横浜市",
    "prefecture_name": "神奈川県",
    "year": 2022,
    "avg_price_per_sqm": 320000.0,
    "min_price_per_sqm": 95000,
    "max_price_per_sqm": 1200000,
    "record_count": 210
  },
  {
    "city_code": "14100",
    "city_name": "横浜市",
    "prefecture_name": "神奈川県",
    "year": 2023,
    "avg_price_per_sqm": 338000.0,
    "min_price_per_sqm": 100000,
    "max_price_per_sqm": 1260000,
    "record_count": 212
  },
  {
    "city_code": "14100",
    "city_name": "横浜市",
    "prefecture_name": "神奈川県",
    "year": 2024,
    "avg_price_per_sqm": 358000.0,
    "min_price_per_sqm": 105000,
    "max_price_per_sqm": 1320000,
    "record_count": 213
  },
  {
    "city_code": "14130",
    "city_name": "川崎市",
    "prefecture_name": "神奈川県",
    "year": 2022,
    "avg_price_per_sqm": 410000.0,
    "min_price_per_sqm": 160000,
    "max_price_per_sqm": 1100000,
    "record_count": 143
  },
  {
    "city_code": "14130",
    "city_name": "川崎市",
    "prefecture_name": "神奈川県",
    "year": 2023,
    "avg_price_per_sqm": 432000.0,
    "min_price_per_sqm": 168000,
    "max_price_per_sqm": 1150000,
    "record_count": 144
  },
  {
    "city_code": "14130",
    "city_name": "川崎市",
    "prefecture_name": "神奈川県",
    "year": 2024,
    "avg_price_per_sqm": 450000.0,
    "min_price_per_sqm": 175000,
    "max_price_per_sqm": 1190000,
    "record_count": 144
  },
  {
    "city_code": "14201",
    "city_name": "相模原市",
    "prefecture_name": "神奈川県",
    "year": 2022,
    "avg_price_per_sqm": 175000.0,
    "min_price_per_sqm": 70000,
    "max_price_per_sqm": 420000,
    "record_count": 98
  },
  {
    "city_code": "14201",
    "city_name": "相模原市",
    "prefecture_name": "神奈川県",
    "year": 2023,
    "avg_price_per_sqm": 178000.0,
    "min_price_per_sqm": 71000,
    "max_price_per_sqm": 428000,
    "record_count": 98
  },
  {
    "city_code": "14201",
    "city_name": "相模原市",
    "prefecture_name": "神奈川県",
    "year": 2024,
    "avg_price_per_sqm": 174000.0,
    "min_price_per_sqm": 70000,
    "max_price_per_sqm": 420000,
    "record_count": 97
  },
  {
    "city_code": "11100",
    "city_name": "さいたま市",
    "prefecture_name": "埼玉県",
    "year": 2022,
    "avg_price_per_sqm": 265000.0,
    "min_price_per_sqm": 95000,
    "max_price_per_sqm": 680000,
    "record_count": 168
  },
  {
    "city_code": "11100",
    "city_name": "さいたま市",
    "prefecture_name": "埼玉県",
    "year": 2023,
    "avg_price_per_sqm": 278000.0,
    "min_price_per_sqm": 99000,
    "max_price_per_sqm": 710000,
    "record_count": 169
  },
  {
    "city_code": "11100",
    "city_name": "さいたま市",
    "prefecture_name": "埼玉県",
    "year": 2024,
    "avg_price_per_sqm": 292000.0,
    "min_price_per_sqm": 103000,
    "max_price_per_sqm": 740000,
    "record_count": 170
  },
  {
    "city_code": "11201",
    "city_name": "川越市",
    "prefecture_name": "埼玉県",
    "year": 2022,
    "avg_price_per_sqm": 148000.0,
    "min_price_per_sqm": 60000,
    "max_price_per_sqm": 350000,
    "record_count": 76
  },
  {
    "city_code": "11201",
    "city_name": "川越市",
    "prefecture_name": "埼玉県",
    "year": 2023,
    "avg_price_per_sqm": 152000.0,
    "min_price_per_sqm": 62000,
    "max_price_per_sqm": 360000,
    "record_count": 76
  },
  {
    "city_code": "11201",
    "city_name": "川越市",
    "prefecture_name": "埼玉県",
    "year": 2024,
    "avg_price_per_sqm": 155000.0,
    "min_price_per_sqm": 63000,
    "max_price_per_sqm": 368000,
    "record_count": 77
  },
  {
    "city_code": "12100",
    "city_name": "千葉市",
    "prefecture_name": "千葉県",
    "year": 2022,
    "avg_price_per_sqm": 185000.0,
    "min_price_per_sqm": 65000,
    "max_price_per_sqm": 480000,
    "record_count": 145
  },
  {
    "city_code": "12100",
    "city_name": "千葉市",
    "prefecture_name": "千葉県",
    "year": 2023,
    "avg_price_per_sqm": 190000.0,
    "min_price_per_sqm": 67000,
    "max_price_per_sqm": 492000,
    "record_count": 146
  },
  {
    "city_code": "12100",
    "city_name": "千葉市",
    "prefecture_name": "千葉県",
    "year": 2024,
    "avg_price_per_sqm": 197000.0,
    "min_price_per_sqm": 69000,
    "max_price_per_sqm": 510000,
    "record_count": 147
  },
  {
    "city_code": "12204",
    "city_name": "船橋市",
    "prefecture_name": "千葉県",
    "year": 2022,
    "avg_price_per_sqm": 220000.0,
    "min_price_per_sqm": 82000,
    "max_price_per_sqm": 560000,
    "record_count": 112
  },
  {
    "city_code": "12204",
    "city_name": "船橋市",
    "prefecture_name": "千葉県",
    "year": 2023,
    "avg_price_per_sqm": 228000.0,
    "min_price_per_sqm": 85000,
    "max_price_per_sqm": 580000,
    "record_count": 113
  },
  {
    "city_code": "12204",
    "city_name": "船橋市",
    "prefecture_name": "千葉県",
    "year": 2024,
    "avg_price_per_sqm": 236000.0,
    "min_price_per_sqm": 88000,
    "max_price_per_sqm": 600000,
    "record_count": 113
  },
  {
    "city_code": "12217",
    "city_name": "柏市",
    "prefecture_name": "千葉県",
    "year": 2022,
    "avg_price_per_sqm": 168000.0,
    "min_price_per_sqm": 58000,
    "max_price_per_sqm": 380000,
    "record_count": 89
  },
  {
    "city_code": "12217",
    "city_name": "柏市",
    "prefecture_name": "千葉県",
    "year": 2023,
    "avg_price_per_sqm": 171000.0,
    "min_price_per_sqm": 59000,
    "max_price_per_sqm": 388000,
    "record_count": 89
  },
  {
    "city_code": "12217",
    "city_name": "柏市",
    "prefecture_name": "千葉県",
    "year": 2024,
    "avg_price_per_sqm": 169000.0,
    "min_price_per_sqm": 58000,
    "max_price_per_sqm": 382000,
    "record_count": 88
  }
]
```

---

## 5. 前年比変化率サマリ（実装確認用）

下表は上記モックデータから計算される2024年の前年比変化率（小数第1位）である。実装後の表示確認に使用すること。

| 市区町村 | 都道府県 | 2023年平均（円/㎡） | 2024年平均（円/㎡） | 前年比 |
|---------|---------|-------------------|-------------------|------|
| 千代田区 | 東京都 | 2,480,000 | 2,610,000 | **+5.2%** ▲ |
| 渋谷区 | 東京都 | 1,505,000 | 1,580,000 | **+5.0%** ▲ |
| 新宿区 | 東京都 | 1,230,000 | 1,295,000 | **+5.3%** ▲ |
| 品川区 | 東京都 | 930,000 | 985,000 | **+5.9%** ▲ |
| 川崎市 | 神奈川県 | 432,000 | 450,000 | **+4.2%** ▲ |
| 板橋区 | 東京都 | 465,000 | 472,000 | **+1.5%** ▲ |
| さいたま市 | 埼玉県 | 278,000 | 292,000 | **+5.0%** ▲ |
| 横浜市 | 神奈川県 | 338,000 | 358,000 | **+5.9%** ▲ |
| 船橋市 | 千葉県 | 228,000 | 236,000 | **+3.5%** ▲ |
| 川越市 | 埼玉県 | 152,000 | 155,000 | **+2.0%** ▲ |
| 千葉市 | 千葉県 | 190,000 | 197,000 | **+3.7%** ▲ |
| 八王子市 | 東京都 | 198,000 | 196,000 | **-1.0%** ▼ |
| 柏市 | 千葉県 | 171,000 | 169,000 | **-1.2%** ▼ |
| 相模原市 | 神奈川県 | 178,000 | 174,000 | **-2.2%** ▼ |

---

## 6. データ品質ルール

モックデータ作成・更新時は以下のルールに従うこと。

| ルール | 内容 |
|--------|------|
| city_code の一意性 | 同一 `city_code` × `year` の組み合わせは1件のみ |
| city_code のフォーマット | JIS X 0402準拠の5桁文字列（例: `"13101"`） |
| prefecture_name の表記 | 「東京都」「神奈川県」「埼玉県」「千葉県」に統一 |
| avg_price_per_sqm | `min_price_per_sqm` 以上 `max_price_per_sqm` 以下 |
| record_count | 1以上の整数 |
| 年度の連続性 | 同一 `city_code` は連続した年度のレコードを持つこと |

---

## 7. 本番APIへの切り替え手順（将来対応）

APIキー取得後、以下の手順で切り替える。

1. `frontend/src/api/landPrices.ts` の `fetchMockCityAnnualSummary` 関数のfetch先を `/api/v1/land-prices/summary/cities` に変更する（または既存の `fetchCityAnnualSummary` 関数に統一する）
2. バックエンドの `GET /api/v1/land-prices/summary/cities` が複数年度のデータを返すことを確認する
3. `public/mock/city_annual_summary.json` はアーカイブとして残すか削除する（どちらでも動作に影響なし）
