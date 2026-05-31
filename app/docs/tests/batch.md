# バッチ処理 テスト仕様書

**プロジェクト**: Real Estate Insight (REI)
**バージョン**: 1.0.0
**作成日**: 2026-04-27
**担当フェーズ**: テスト設計 — test-planner
**参照設計書**: `docs/designs/backend.md`, `docs/requirements/strategy.md`, `docs/architecture/architecture.md`

---

## 1. テスト方針

### 1.1 対象スコープ

| 対象 | テスト種別 |
|------|----------|
| `batch/fetch_land_prices.py` CLI 引数処理 | 単体テスト |
| `batch/fetch_transaction_prices.py` CLI 引数処理 | 単体テスト |
| `batch/base.py` 共通取得・upsert フロー | 単体テスト（httpx モック + DB モック） |
| タイル取得 → パース → upsert の E2E フロー | 統合テスト（インメモリ DB + httpx モック） |
| エラーハンドリング（各 HTTP エラー種別） | 単体テスト |
| `--dry-run` モード | 単体テスト |
| ログ出力の安全性（APIキー混入なし） | 単体テスト |

### 1.2 テストフレームワーク・ツール

- **pytest** + **pytest-asyncio**
- **respx** または **httpx.MockTransport**
- **caplog**（pytest ログキャプチャ）
- **SQLite インメモリ DB** または **MagicMock**

### 1.3 テスト実行方針

- 実 reinfolib API は呼び出さない（全てモック化）
- 実 PostgreSQL DB は使用しない
- `--dry-run` モードでのフローは必ず検証する

---

## 2. CLI 引数処理テスト — `fetch_land_prices.py`

| テスト ID | テストケース | 引数 | 期待結果 |
|----------|------------|------|---------|
| BATCH-LP-CLI-01 | 必須引数のみ（正常） | `--year-from 2022 --year-to 2024` | 正常終了、デフォルト pref_codes 使用 |
| BATCH-LP-CLI-02 | `--year-from` 省略 | `--year-to 2024` のみ | エラー終了 |
| BATCH-LP-CLI-03 | `--year-to` 省略 | `--year-from 2022` のみ | エラー終了 |
| BATCH-LP-CLI-04 | `--pref-codes` 指定 | `--pref-codes 13,14` | `pref_codes = ["13", "14"]` で実行 |
| BATCH-LP-CLI-05 | `--dry-run` フラグ | `--dry-run` 付き | DB 書き込みなし、ログ出力のみ |
| BATCH-LP-CLI-06 | `--log-level DEBUG` | `--log-level DEBUG` | DEBUG ログが出力される |
| BATCH-LP-CLI-07 | `--log-level WARNING` | `--log-level WARNING` | INFO ログが抑制される |
| BATCH-LP-CLI-08 | 不正な year 値（文字列） | `--year-from abc` | argparse エラー |

---

## 3. CLI 引数処理テスト — `fetch_transaction_prices.py`

| テスト ID | テストケース | 引数 | 期待結果 |
|----------|------------|------|---------|
| BATCH-TX-CLI-01 | 必須引数のみ | `--year-from 2022 --year-to 2024` | 正常終了、`quarter_from=1`, `quarter_to=4` |
| BATCH-TX-CLI-02 | 四半期指定 | `--quarter-from 2 --quarter-to 3` | Q2〜Q3 のみ処理 |
| BATCH-TX-CLI-03 | `--dry-run` | `--dry-run` 付き | DB 書き込みなし |
| BATCH-TX-CLI-04 | `--quarter-from` 下限違反 | `--quarter-from 0` | エラー終了 |
| BATCH-TX-CLI-05 | `--quarter-to` 上限違反 | `--quarter-to 5` | エラー終了 |

---

## 4. フロー統合テスト — XPT001 バッチ E2E（モック使用）

| テスト ID | テストケース | 前提条件 | 期待結果 |
|----------|------------|---------|---------|
| BATCH-E2E-01 | 正常フロー（1 タイル・3 フィーチャー） | HTTP 200 + 3 features | DB に 3 件 upsert、`completed` に遷移 |
| BATCH-E2E-02 | 正常フロー（複数タイル） | 各タイルが HTTP 200 + features | 全タイルの features が upsert される |
| BATCH-E2E-03 | `dry_run=True` | HTTP 200 + features | DB への INSERT が行われない |
| BATCH-E2E-04 | 全タイルで空 features | HTTP 200 + `{"features": []}` | DB 変化なし、`completed` で終了 |
| BATCH-E2E-05 | 一部タイルがエラー | 1 タイル: HTTP 500、他: HTTP 200 | エラータイルをスキップ、`partial` 状態 |
| BATCH-E2E-06 | 全タイルがエラー | 全タイル: HTTP 500 | DB 変化なし、`failed` 状態 |
| BATCH-E2E-07 | city_code フィルタが機能する | 一都三県外の city_code を含む features | 対象外レコードは upsert されない |
| BATCH-E2E-08 | 重複取得時に upsert が冪等 | 同一データを 2 回実行 | DB の件数が増えず、`updated_at` のみ更新 |

---

## 5. フロー統合テスト — XPT002 バッチ E2E（モック使用）

| テスト ID | テストケース | 前提条件 | 期待結果 |
|----------|------------|---------|---------|
| BATCH-LP-E2E-01 | 正常フロー（1 タイル） | HTTP 200 + 2 features | DB に 2 件 upsert |
| BATCH-LP-E2E-02 | `dry_run=True` | HTTP 200 + features | DB への INSERT なし |
| BATCH-LP-E2E-03 | 重複取得（upsert 冪等性） | 同一データを 2 回実行 | DB の件数が増えない |

---

## 6. エラーハンドリングテスト

| テスト ID | テストケース | モック設定 | 期待結果 |
|----------|------------|----------|---------|
| BATCH-ERR-01 | HTTP 401 で即時中断 | HTTP 401 | `RuntimeError` 送出、exit code 1 |
| BATCH-ERR-02 | HTTP 403 で即時中断 | HTTP 403 | `RuntimeError` 送出、exit code 1 |
| BATCH-ERR-03 | HTTP 429 → バックオフ後成功 | 1 回目 429、2 回目 200 | 成功、リトライ待機を確認 |
| BATCH-ERR-04 | HTTP 429 → リトライ上限後スキップ | 全 4 回 429 | タイルをスキップ、処理継続（exit code 0） |
| BATCH-ERR-05 | HTTP 500 → リトライ後スキップ | 全リクエストが 500 | タイルをスキップ、警告ログ出力 |
| BATCH-ERR-06 | ネットワークタイムアウト → スキップ | `httpx.TimeoutException` | タイルをスキップ、処理継続 |
| BATCH-ERR-07 | JSON パースエラー → スキップ | 不正 JSON レスポンス | タイルをスキップ、エラーログに先頭 200 文字を記録 |
| BATCH-ERR-08 | DB upsert 失敗 → ロールバック後スキップ | DB の INSERT でエラー | ロールバック実行、処理継続 |
| BATCH-ERR-09 | 部分エラー時の exit code | 一部タイルがスキップ | exit code 0（警告サマリー付き） |
| BATCH-ERR-10 | 全エラー中断時の exit code | 認証エラーで中断 | exit code 1 |

---

## 7. ログ出力テスト

| テスト ID | テストケース | 確認内容 | 期待結果 |
|----------|------------|---------|---------|
| BATCH-LOG-01 | 完了ログに統計情報が含まれる | 正常フロー後のログ | `取得件数`, `upsert件数`, `エラー件数` が出力される |
| BATCH-LOG-02 | APIキーがログに含まれない（SEC-PARSE-05） | エラー発生時のログをキャプチャ | ログ文字列に `re_info_lib_key` の値が含まれない |
| BATCH-LOG-03 | HTTP 429 時にリトライ待機ログが出力される | HTTP 429 モック | WARNING レベルで待機秒数を含むログ |
| BATCH-LOG-04 | タイルスキップ時に WARNING ログ | タイルエラー発生 | WARNING レベルで `(z, x, y)` を含むログ |
| BATCH-LOG-05 | city_code フィルタ除外は DEBUG レベル | 一都三県外の features | DEBUG レベルのログ（INFO 以上では非表示） |
| BATCH-LOG-06 | 構造化ログ（JSON 形式） | 正常フロー後のログ | ログが JSON パース可能な構造で出力される |

---

## 8. `trade_period` 抽出テスト（SEC-PARSE-04）

| テスト ID | テストケース | 入力文字列 | 期待結果 |
|----------|------------|----------|---------|
| BATCH-PERIOD-01 | 正常: 第 1 四半期 | `"2024年第1四半期"` | `year=2024, quarter=1` |
| BATCH-PERIOD-02 | 正常: 第 4 四半期 | `"2022年第4四半期"` | `year=2022, quarter=4` |
| BATCH-PERIOD-03 | 不正: 年のみ | `"2024年"` | `None` |
| BATCH-PERIOD-04 | 不正: 空文字 | `""` | `None` |
| BATCH-PERIOD-05 | 不正: 英語フォーマット | `"2024Q1"` | `None` |
| BATCH-PERIOD-06 | 不正: 四半期が 0 | `"2024年第0四半期"` | `None`（範囲外） |
| BATCH-PERIOD-07 | 不正: 四半期が 5 | `"2024年第5四半期"` | `None`（範囲外） |

---

## 9. タイル計算と bbox 統合テスト

| テスト ID | テストケース | 入力 | 期待結果 |
|----------|------------|------|---------|
| BATCH-BBOX-01 | GeoJSON から bbox 取得 | `municipalities.geojson` の 1 フィーチャー | `min_lat, min_lon, max_lat, max_lon` を正しく抽出 |
| BATCH-BBOX-02 | bbox → タイルリスト変換（z=12） | 東京都千代田区の bbox | 少なくとも 1 件の `(12, x, y)` を返す |
| BATCH-BBOX-03 | デフォルトズームレベル 12 を使用 | デフォルト設定 | 生成タイルの z が全て 12 |
| BATCH-BBOX-04 | `batch_zoom_level=11` に変更 | 設定変更 | 生成タイルの z が全て 11 |

---

## 10. 並列リクエスト制御テスト（`asyncio.Semaphore`）

| テスト ID | テストケース | 前提条件 | 期待結果 |
|----------|------------|---------|---------|
| BATCH-CONCUR-01 | 同時リクエスト数が設定値を超えない | `batch_concurrent_requests=2`、タイル 5 件 | 任意の瞬間に 2 件を超える並列リクエストが発生しない |
| BATCH-CONCUR-02 | セマフォ解放後に次のリクエストが実行される | 上記と同じ設定 | 全 5 件のリクエストが完了する |

---

## 11. upsert 冪等性テスト

| テスト ID | テストケース | 操作 | 期待結果 |
|----------|------------|------|---------|
| BATCH-IDEM-01 | 同一 `raw_transaction_prices` を 2 回 upsert | 同一ユニーク制約キー | DB レコード数は 1 件のまま |
| BATCH-IDEM-02 | 同一 `raw_land_prices` を 2 回 upsert | 同一 (city_code, year, address) | DB レコード数は 1 件のまま |
| BATCH-IDEM-03 | upsert 後の `updated_at` が更新される | 同一レコードを 2 回 upsert | 2 回目の `updated_at` が 1 回目より新しい |

---

## 12. テスト実装ファイル配置

```
backend/
└── tests/
    └── batch/
        ├── test_fetch_land_prices_cli.py
        ├── test_fetch_transaction_prices_cli.py
        ├── test_batch_e2e_land_prices.py
        ├── test_batch_e2e_transactions.py
        ├── test_batch_error_handling.py
        ├── test_batch_logging.py
        ├── test_trade_period_parser.py
        ├── test_bbox_and_tiles.py
        └── test_upsert_idempotency.py
```
