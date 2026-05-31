import math
from collections.abc import Iterator


def _lat_lon_to_tile(lat: float, lon: float, zoom: int) -> tuple[int, int]:
    x = int((lon + 180.0) / 360.0 * (2 ** zoom))
    lat_rad = math.radians(lat)
    y = int((1.0 - math.log(math.tan(lat_rad) + 1.0 / math.cos(lat_rad)) / math.pi) / 2.0 * (2 ** zoom))
    return x, y


def bbox_to_tiles(
    min_lat: float,
    min_lon: float,
    max_lat: float,
    max_lon: float,
    zoom: int,
) -> Iterator[tuple[int, int, int]]:
    """bounding box を覆う Slippy Map タイル座標を列挙する（z, x, y）"""
    x_min, y_max = _lat_lon_to_tile(min_lat, min_lon, zoom)
    x_max, y_min = _lat_lon_to_tile(max_lat, max_lon, zoom)
    for x in range(x_min, x_max + 1):
        for y in range(y_min, y_max + 1):
            yield zoom, x, y
