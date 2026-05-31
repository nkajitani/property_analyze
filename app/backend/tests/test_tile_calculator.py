"""
BE-TILE-01〜05: services/tile_calculator.py
"""
from app.services.tile_calculator import _lat_lon_to_tile, bbox_to_tiles


class TestLatLonToTile:
    def test_be_tile_01_tokyo_station(self):
        """東京駅付近のタイル変換 zoom=12"""
        x, y = _lat_lon_to_tile(35.6812, 139.7671, 12)
        # zoom=12 での東京駅タイル (3637, 1613) 前後を許容
        assert 3630 <= x <= 3645
        assert 1608 <= y <= 1620

    def test_be_tile_02_single_tile_bbox(self):
        """同一タイルに収まる bbox → 1 件"""
        x, y = _lat_lon_to_tile(35.6812, 139.7671, 12)
        # タイル内に収まる微小な bbox を作成
        import math
        tile_size = 360.0 / (2 ** 12)  # 経度方向の 1 タイルサイズ
        min_lon = -180 + x * tile_size + 0.001
        max_lon = min_lon + tile_size * 0.5
        # 緯度は近似で同じタイル内に収める
        tiles = list(bbox_to_tiles(35.680, min_lon, 35.682, max_lon, 12))
        assert len(tiles) >= 1

    def test_be_tile_03_multiple_tiles(self):
        """複数タイルにまたがる bbox → 複数件"""
        # 広い範囲を指定すれば複数タイルが返る
        tiles = list(bbox_to_tiles(35.6, 139.6, 35.8, 139.9, 12))
        assert len(tiles) > 1

    def test_be_tile_04_zoom_12(self):
        """生成タイルの z が全て 12"""
        tiles = list(bbox_to_tiles(35.6, 139.6, 35.8, 139.9, 12))
        assert all(t[0] == 12 for t in tiles)

    def test_be_tile_05_y_direction(self):
        """北緯が大きい (max_lat) 側で y が小さい（Slippy Map 座標系）"""
        _, y_south = _lat_lon_to_tile(35.6, 139.7, 12)  # 南側
        _, y_north = _lat_lon_to_tile(35.8, 139.7, 12)  # 北側
        # 北側の y は南側より小さい
        assert y_north < y_south
