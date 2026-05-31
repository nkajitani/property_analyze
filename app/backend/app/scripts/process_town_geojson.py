"""
e-Stat 小地域シェープファイル → 町レベル GeoJSON 変換スクリプト

使い方:
  pip install geopandas
  python scripts/process_town_geojson.py

入力: /app/r2ka13.shp（東京都 小地域）
出力: /app/frontend/public/geo/towns_13.geojson
"""

import re
import sys
from pathlib import Path

try:
    import geopandas as gpd
except ImportError:
    print("geopandas が未インストールです。`pip install geopandas` を実行してください。")
    sys.exit(1)

# ── 設定 ────────────────────────────────────────────────────────────────────
PREF_FILES = {
    "13": "/app/r2ka13.shp",
    # 他県を追加する場合:
    "11": "/app/r2ka11.shp",
    "12": "/app/r2ka12.shp",
    "14": "/app/r2ka14.shp",
}
OUTPUT_DIR = Path("/app")
OUTPUT_FILE = OUTPUT_DIR / "towns.geojson"

# 丁目パターン（漢数字・算用数字の両方に対応）
_CHOME_RE = re.compile(r"[一二三四五六七八九十百\d]+丁目$")


def strip_chome(name: str) -> str:
    return _CHOME_RE.sub("", name).strip()


def process_pref(shp_path: str, pref_code: str) -> gpd.GeoDataFrame:
    print(f"読み込み中: {shp_path}")
    gdf = gpd.read_file(shp_path, encoding="cp932")

    print(f"  フィーチャー数: {len(gdf)}")
    print(f"  カラム: {list(gdf.columns)}")

    # 市区町村コード（5桁）を KEY_CODE の先頭5桁から取得
    gdf["city_code"] = gdf["KEY_CODE"].astype(str).str[:5]

    # 市区町村名（S_NAME から 丁目除去）
    gdf["district_name"] = (
        gdf["S_NAME"]
        .fillna("")
        .astype(str)
        .str.replace(_CHOME_RE, "", regex=True)
        .str.strip()
    )

    # 地物が空のものを除外
    gdf = gdf[gdf.geometry.notna() & ~gdf.geometry.is_empty]

    # city_code + district_name でdissolve
    print("  Dissolve 実行中...")
    town_gdf = (
        gdf[["city_code", "district_name", "geometry"]]
        .dissolve(by=["city_code", "district_name"])
        .reset_index()
    )

    print(f"  Dissolve 後フィーチャー数: {len(town_gdf)}")

    # 軽量化（simplify）
    town_gdf["geometry"] = town_gdf["geometry"].simplify(
        0.0001, preserve_topology=True
    )

    # CRS を WGS84 に変換
    if town_gdf.crs and town_gdf.crs.to_epsg() != 4326:
        town_gdf = town_gdf.to_crs(epsg=4326)

    return town_gdf


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    all_gdfs = []
    for pref_code, shp_path in PREF_FILES.items():
        if not Path(shp_path).exists():
            print(f"ファイルが見つかりません: {shp_path} → スキップ")
            continue
        gdf = process_pref(shp_path, pref_code)
        all_gdfs.append(gdf)

    if not all_gdfs:
        print("処理対象ファイルがありませんでした。")
        sys.exit(1)

    import pandas as pd
    result = gpd.GeoDataFrame(
        pd.concat(all_gdfs, ignore_index=True), crs="EPSG:4326"
    )

    print(f"\n合計フィーチャー数: {len(result)}")
    print(f"保存中: {OUTPUT_FILE}")
    result.to_file(OUTPUT_FILE, driver="GeoJSON")
    print("完了。")

    # サンプル表示
    sample = result[result["city_code"] == "13113"].head(5)
    print("\n世田谷区サンプル:")
    print(sample[["city_code", "district_name"]].to_string())


if __name__ == "__main__":
    main()
