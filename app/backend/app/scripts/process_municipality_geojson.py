"""
国土数値情報 N03 行政区域シェープファイル → 市区町村レベル municipalities.geojson 変換

使い方:
  pip install geopandas
  python scripts/process_municipality_geojson.py

事前準備:
  国土数値情報ダウンロードサービス https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N03-2023.html
  から「令和5年 全国版（N03-23_GML.zip）」をダウンロードして /app/ に展開する。
  展開後のファイル: /app/N03-23_230101.shp （ファイル名は年度で変わる）

出力: /app/frontend/public/geo/municipalities.geojson
"""

import sys
from pathlib import Path

try:
    import geopandas as gpd
except ImportError:
    print("geopandas が未インストールです。`pip install geopandas` を実行してください。")
    sys.exit(1)

# ── 設定 ────────────────────────────────────────────────────────────────────
# N03-23 全国版シェープファイルのパス（ファイル名は年度により異なる）
N03_SHP = "/app/N03-23_230101.shp"

# 対象都道府県コード
TARGET_PREFS = {"11", "12", "13", "14"}  # 埼玉・千葉・東京・神奈川

OUTPUT_FILE = Path("/app/frontend/public/geo/municipalities.geojson")

# 政令市名（N03_003）→ 市コードのマッピング（政令市の ward を parent city code にまとめる場合は不要）
# ここでは個々の区コード（N03_007）をそのまま city_code として使う


def main():
    shp_path = Path(N03_SHP)

    # 年度違いのファイル名を自動検出
    if not shp_path.exists():
        candidates = list(Path("/app").glob("N03-*.shp"))
        if candidates:
            shp_path = candidates[0]
            print(f"シェープファイルを自動検出: {shp_path}")
        else:
            print(f"エラー: シェープファイルが見つかりません。{N03_SHP} を配置してください。")
            sys.exit(1)

    print(f"読み込み中: {shp_path}")
    gdf = gpd.read_file(shp_path, encoding="cp932")
    print(f"  全国フィーチャー数: {len(gdf)}")
    print(f"  カラム: {list(gdf.columns)}")

    # 対象4県に絞り込み（N03_001 = 都道府県名、N03_007 の先頭2桁でも可）
    pref_name_map = {"埼玉県": "11", "千葉県": "12", "東京都": "13", "神奈川県": "14"}
    gdf = gdf[gdf["N03_001"].isin(pref_name_map.keys())].copy()
    print(f"  4県フィーチャー数: {len(gdf)}")

    # N03_007 が正しい市区町村コード（5桁）。政令市の区コードもここに入る
    gdf = gdf[gdf["N03_007"].notna()].copy()
    gdf["city_code"] = gdf["N03_007"].astype(str).str.zfill(5)

    # 市区町村名: 政令市の区は N03_004（区名）、一般市は N03_004（市名）
    gdf["city_name"] = gdf["N03_004"].fillna(gdf["N03_003"]).fillna("")

    # geometry が空のものを除外
    gdf = gdf[gdf.geometry.notna() & ~gdf.geometry.is_empty]

    # city_code + city_name で dissolve（同じ市区町村の複数ポリゴンをひとつに）
    print("  Dissolve 実行中...")
    muni_gdf = (
        gdf[["city_code", "city_name", "geometry"]]
        .dissolve(by=["city_code", "city_name"])
        .reset_index()
    )
    print(f"  Dissolve 後フィーチャー数: {len(muni_gdf)}")

    # 軽量化
    muni_gdf["geometry"] = muni_gdf["geometry"].simplify(0.0003, preserve_topology=True)

    # CRS を WGS84 に変換
    if muni_gdf.crs and muni_gdf.crs.to_epsg() != 4326:
        muni_gdf = muni_gdf.to_crs(epsg=4326)

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    muni_gdf.to_file(str(OUTPUT_FILE), driver="GeoJSON")
    print(f"\n保存完了: {OUTPUT_FILE}")
    print(f"合計フィーチャー数: {len(muni_gdf)}")

    # 都道府県別集計
    for pname, pcode in pref_name_map.items():
        count = len(muni_gdf[muni_gdf["city_code"].str.startswith(pcode)])
        print(f"  {pname}: {count} 市区町村")

    # サンプル確認
    print("\n東京都サンプル（先頭10件）:")
    sample = muni_gdf[muni_gdf["city_code"].str.startswith("13")].head(10)
    print(sample[["city_code", "city_name"]].to_string())


if __name__ == "__main__":
    main()
