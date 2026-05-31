# セキュリティ要件定義（REI プロジェクト）

**バージョン**: 1.0.0  
**作成日**: 2026-04-27  
**担当フェーズ**: セキュリティ要件定義 — security-reviewer

---

## 脅威リスク一覧（優先度順）

| 優先度 | 脅威 | 対象 | 対策 |
|-------|------|------|------|
| P1 | `.env` / `compose.yml` の認証情報漏洩 | `RE_INFO_LIB_KEY`, `rei_password` | `.gitignore` 強化、`compose.yml` ハードコード除去、`config.py` デフォルト値削除 |
| P1 | API キーのログ混入 | バッチログ | ロギング制御 |
| P2 | バッチ起動エンドポイントへの不正アクセス | `POST /api/v1/ingest/*` | `X-Admin-Token` 検証 |
| P2 | 巨大年範囲指定による DoS | バッチパラメータ | 値域バリデーション |
| P2 | Docker 全 IF バインドによる意図せぬ露出 | 全サービス | `127.0.0.1` バインド |
| P3 | 外部 GeoJSON 不正データによる DB 汚染 | reinfolib パーサー | pydantic 防御的パース |
| P3 | `text()` 経由の SQL インジェクション | 将来の生クエリ | bindparams 必須 |
| P4 | クラウド移行時の認証なし露出 | バッチ系エンドポイント | Depends 差し替え設計 |

---

## A. シークレット管理（P1）

### 現状の問題

1. `config.py` に `rei_password` を含むデフォルト DB URL がハードコードされている。デフォルト値を削除し、未設定時は起動失敗とすること。
2. `compose.yml` に `DATABASE_URL` がハードコードされている。`env_file: ./backend/.env` 方式に変更すること。
3. `.gitignore` に `backend/.env` と `.env.*` パターンが不足している。
4. `RE_INFO_LIB_KEY` はいかなるログ・スタックトレースにも出力しないこと。

### 要件

- **SEC-SECRET-01**: `config.py` の `database_url` / `re_info_lib_key` はデフォルト値なしで定義する。未設定時は `ValidationError` で起動失敗とすること
- **SEC-SECRET-02**: `.env.example`（実値なし）をリポジトリに含め、`.env` / `backend/.env` / `.env.*` は `.gitignore` に登録すること
- **SEC-SECRET-03**: ログ出力時に `settings.re_info_lib_key` の値が混入しないよう、`model_config = {"json_schema_extra": {"secret": True}}` または同等の制御を行うこと

---

## B. バッチ起動エンドポイントの保護（P2）

### 要件

- **SEC-AUTH-01**: `POST /api/v1/ingest/*` と `GET /api/v1/ingest/jobs/{job_id}` に `X-Admin-Token` ヘッダー検証を FastAPI の `Depends` で実装すること。トークン不一致時は HTTP 403
- **SEC-AUTH-02**: `ADMIN_TOKEN` は `.env` 管理とし、`config.py` でデフォルト値なしのフィールドとして定義すること。将来の AWS Secrets Manager 等への差し替えを想定し、`Depends` による依存性注入で実装すること

---

## C. 入力バリデーション（P2）

### 要件

- **SEC-VAL-01**: `year_from` / `year_to` は `2000 <= year <= 現在年+1` の値域チェック。巨大年範囲は無制限タイルリクエスト（DoS）につながる
- **SEC-VAL-02**: `year_to >= year_from` の相関バリデーションを `model_validator` で実装すること
- **SEC-VAL-03**: `pref_codes` は `{"11", "12", "13", "14"}` の allowlist 検証
- **SEC-VAL-04**: `quarter_from` / `quarter_to` は 1〜4 の整数に制限
- **SEC-VAL-05**: GET エンドポイントの `city_code` は 5桁数字の正規表現検証（`^[0-9]{5}$`）

---

## D. 外部データの信頼性（P3）

### 要件

- **SEC-PARSE-01**: reinfolib GeoJSON レスポンスは pydantic モデルで厳密にバリデーションし、`extra='ignore'` で想定外フィールドを無視すること
- **SEC-PARSE-02**: 数値フィールドが null や文字列で返された場合、レコード単位でスキップしバッチ全体を止めないこと
- **SEC-PARSE-03**: 緯度 -90〜90、経度 -180〜180 の値域チェックを実装すること
- **SEC-PARSE-04**: `trade_period` からの year / quarter 抽出は正規表現で厳密にマッチし、不正フォーマット時はスキップすること
- **SEC-PARSE-05**: エラー時のレスポンスボディログ出力にリクエストヘッダー（API キー）が混入しないこと

---

## E. SQL インジェクション（P3）

### 要件

- **SEC-VAL-06**: SQLAlchemy ORM 経由のクエリはバインド変数を自動使用するため現状リスクは低い。`text()` 使用箇所でのユーザー入力の文字列連結埋め込みを厳禁とすること
- **SEC-VAL-07**: `text()` 使用時は必ず `.bindparams()` を用いること（f-string 埋め込み禁止）

`v_price_divergence` の `transaction_type IN ('宅地(土地)', '宅地(土地と建物)')` はリテラル値のため現状問題なし。

---

## F. ローカル環境固有のリスク（P2）

### 要件

- **SEC-DOCKER-01**: `compose.yml` の全ポートを `127.0.0.1` バインドに変更すること。現状では公衆 Wi-Fi 接続時に同一ネットワークの他端末からアクセス可能

```yaml
ports:
  - "127.0.0.1:8000:8000"
  - "127.0.0.1:3000:3000"
  - "127.0.0.1:5432:5432"
```

- **SEC-DOCKER-02**: クラウド移行時は PostgreSQL の `ports` 設定を削除し、Docker 内部ネットワーク通信のみとすること
- **SEC-AUTH-04**: CORS 設定を `http://localhost:3000` のみに確定すること。ワイルドカード `*` は禁止
