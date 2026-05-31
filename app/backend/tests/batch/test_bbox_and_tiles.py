"""
BATCH-BBOX-01〜04: タイル計算と bbox 統合テスト
"""
from app.services.tile_calculator import bbox_to_tiles


class TestBboxAndTiles:
    def test_batch_bbox_02_tokyo_chiyoda(self):
        """BATCH-BBOX-02: 東京都千代田区の bbox → 少なくとも 1 件の (12, x, y) を返す"""
        # 千代田区の近似 bbox
        min_lat, min_lon, max_lat, max_lon = 35.665, 139.730, 35.700, 139.780
        tiles = list(bbox_to_tiles(min_lat, min_lon, max_lat, max_lon, 12))
        assert len(tiles) >= 1
        assert all(t[0] == 12 for t in tiles)

    def test_batch_bbox_03_default_zoom_12(self):
        """BATCH-BBOX-03: デフォルト zoom=12"""
        tiles = list(bbox_to_tiles(35.0, 138.8, 36.3, 140.2, 12))
        assert all(t[0] == 12 for t in tiles)

    def test_batch_bbox_04_zoom_11(self):
        """BATCH-BBOX-04: batch_zoom_level=11"""
        tiles = list(bbox_to_tiles(35.0, 138.8, 36.3, 140.2, 11))
        assert all(t[0] == 11 for t in tiles)
