'use client';
import type { Map as MapLibreMap, MapGeoJSONFeature } from "maplibre-gl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MapGL, { Layer, Source } from "react-map-gl/maplibre";
import type { CityChangeRate } from "../types/landPrice";

// ── 型定義 ──────────────────────────────────────────────────────────────────

interface LandPriceMapProps {
  changeRates: CityChangeRate[];
  prefectureCode?: string;
  onCityClick?: (cityCode: string) => void;
}

interface HoverInfo {
  x: number;
  y: number;
  cityCode: string;
  cityName: string;
}

interface GeoJSONProperties {
  city_code: string;
  city_name: string;
  N03_004?: string;  // 旧GeoJSON互換
  N03_007?: string;  // 旧GeoJSON互換（旧版は親市コードで誤っていたため N03_007 を優先）
  fill_color?: string;
  fill_opacity?: number;
}

function featureCityCode(props: GeoJSONProperties): string {
  return props.N03_007 || props.city_code;
}

interface GeoJSONFeature {
  type: "Feature";
  properties: GeoJSONProperties;
  geometry: object;
}

interface GeoJSONCollection {
  type: "FeatureCollection";
  features: GeoJSONFeature[];
}

// ── 定数 ────────────────────────────────────────────────────────────────────

const INITIAL_VIEW = {
  longitude: 139.5,
  latitude: 35.7,
  zoom: 7.5,
};

const MAP_STYLE =
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

const COLOR_UP = "#34d399";
const COLOR_DOWN = "#f87171";
const COLOR_FLAT = "#94a3b8";
const COLOR_NODATA = "#334155";

const OPACITY_NORMAL = 0.65;
const OPACITY_HOVER = 0.85;
const OPACITY_NODATA = 0.3;

// ── ユーティリティ ───────────────────────────────────────────────────────────

function getFillColor(changeRate: number | null): string {
  if (changeRate === null) return COLOR_NODATA;
  if (changeRate > 0) return COLOR_UP;
  if (changeRate < 0) return COLOR_DOWN;
  return COLOR_FLAT;
}

function formatChangeRate(changeRate: number | null): string {
  if (changeRate === null) return "—";
  if (changeRate > 0) return `+${changeRate.toFixed(1)}% ▲`;
  if (changeRate < 0) return `${changeRate.toFixed(1)}% ▼`;
  return "0.0%";
}

function formatAvgPrice(avgPricePerSqm: number): string {
  return avgPricePerSqm.toLocaleString();
}

// ── スケルトン ────────────────────────────────────────────────────────────────

function MapSkeleton() {
  return (
    <div
      className="shimmer"
      style={{
        height: "500px",
        borderRadius: "20px",
        border: "1px solid rgba(255,255,255,0.05)",
        background: "rgba(255,255,255,0.02)",
      }}
    />
  );
}

// ── 凡例 ──────────────────────────────────────────────────────────────────────

function Legend() {
  const items: { color: string; label: string }[] = [
    { color: COLOR_UP, label: "上昇 ▲" },
    { color: COLOR_FLAT, label: "変化なし" },
    { color: COLOR_DOWN, label: "下降 ▼" },
  ];
  return (
    <div
      style={{
        position: "absolute",
        bottom: "24px",
        right: "12px",
        background: "rgba(6,13,31,0.85)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "10px",
        padding: "10px 14px",
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        zIndex: 1,
        pointerEvents: "none",
      }}
    >
      {items.map((item) => (
        <div
          key={item.label}
          style={{ display: "flex", alignItems: "center", gap: "8px" }}
        >
          <div
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "2px",
              background: item.color,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: "11px",
              color: "#94a3b8",
              fontWeight: 500,
              fontFamily: "Inter, sans-serif",
            }}
          >
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── ツールチップ ──────────────────────────────────────────────────────────────

interface TooltipProps {
  hoverInfo: HoverInfo;
  changeRateMap: Map<string, CityChangeRate>;
}

function MapTooltip({ hoverInfo, changeRateMap }: TooltipProps) {
  const data = changeRateMap.get(hoverInfo.cityCode);

  return (
    <div
      style={{
        position: "absolute",
        left: hoverInfo.x + 12,
        top: hoverInfo.y - 12,
        background: "rgba(6,13,31,0.96)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "12px",
        padding: "12px 16px",
        minWidth: "180px",
        boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
        pointerEvents: "none",
        zIndex: 10,
      }}
    >
      <p
        style={{
          fontSize: "13px",
          fontWeight: 700,
          color: "#e2e8f0",
          letterSpacing: "-0.02em",
          marginBottom: "8px",
        }}
      >
        {hoverInfo.cityName}
      </p>
      {data ? (
        <>
          <div style={{ marginBottom: "4px" }}>
            <span
              className="num"
              style={{
                fontSize: "10px",
                color: "#475569",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              {data.baseYear}→{data.compareYear}年 変化率
            </span>
          </div>
          <p
            className="num"
            style={{
              fontSize: "20px",
              fontWeight: 700,
              color: getFillColor(data.changeRate),
              letterSpacing: "-0.03em",
              lineHeight: 1,
              marginBottom: "8px",
            }}
          >
            {formatChangeRate(data.changeRate)}
          </p>
          <p style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 400 }}>
            平均地価&nbsp;
            <span
              className="num"
              style={{ color: "#cbd5e1", fontWeight: 600 }}
            >
              {formatAvgPrice(data.avgPricePerSqm)}
            </span>
            &nbsp;円/㎡
          </p>
        </>
      ) : (
        <p style={{ fontSize: "12px", color: "#475569" }}>データなし</p>
      )}
    </div>
  );
}

// ── メインコンポーネント ────────────────────────────────────────────────────────

export default function LandPriceMap({ changeRates, prefectureCode, onCityClick }: LandPriceMapProps) {
  const [geoJson, setGeoJson] = useState<GeoJSONCollection | null>(null);
  const [geoLoading, setGeoLoading] = useState(true);
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);

  // changeRates を city_code → CityChangeRate の Map に変換
  const changeRateMap = useMemo(
    () => new Map<string, CityChangeRate>(changeRates.map((r) => [r.city_code, r])),
    [changeRates]
  );

  // GeoJSON フェッチ
  useEffect(() => {
    setGeoLoading(true);
    fetch("/geo/municipalities.geojson")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`GeoJSON fetch failed: ${res.status}`);
        }
        return res.json() as Promise<GeoJSONCollection>;
      })
      .then((raw) => {
        setGeoJson(raw);
      })
      .catch((err: unknown) => {
        console.error("GeoJSON fetch error:", err);
      })
      .finally(() => {
        setGeoLoading(false);
      });
  }, []);

  // changeRates が変わるたびに色を再計算して GeoJSON を更新
  const coloredGeoJson = useMemo<GeoJSONCollection | null>(() => {
    if (!geoJson) return null;
    const features = prefectureCode
      ? geoJson.features.filter((f) => featureCityCode(f.properties).startsWith(prefectureCode))
      : geoJson.features;
    return {
      ...geoJson,
      features: features.map((feature) => {
        const cityCode = featureCityCode(feature.properties);
        const rate = changeRateMap.get(cityCode);
        const hasData = rate !== undefined;
        const fillColor = hasData
          ? getFillColor(rate.changeRate)
          : COLOR_NODATA;
        const fillOpacity = hasData ? OPACITY_NORMAL : OPACITY_NODATA;
        return {
          ...feature,
          properties: {
            ...feature.properties,
            fill_color: fillColor,
            fill_opacity: fillOpacity,
          },
        };
      }),
    };
  }, [geoJson, changeRateMap]);

  // 本土域のみでバウンドを計算（lat<35° の離島を除外）
  const fitToFeatures = useCallback((features: GeoJSONCollection['features']) => {
    if (!mapRef.current) return;
    const coords: [number, number][] = [];
    for (const f of features) {
      const geom = f.geometry as { type: string; coordinates: unknown };
      if (!geom) continue;
      const rings =
        geom.type === "Polygon"
          ? (geom.coordinates as [number, number][][])
          : geom.type === "MultiPolygon"
          ? (geom.coordinates as [number, number][][][]).flat()
          : [];
      for (const ring of rings) {
        for (const [lng, lat] of ring) {
          // 一都三県本土域（伊豆・小笠原諸島を除外）
          if (lat >= 35.0 && lat <= 37.5 && lng >= 138.4 && lng <= 141.0) {
            coords.push([lng, lat]);
          }
        }
      }
    }
    if (coords.length === 0) return;
    const minLng = coords.reduce((a, [lng]) => Math.min(a, lng), Infinity);
    const maxLng = coords.reduce((a, [lng]) => Math.max(a, lng), -Infinity);
    const minLat = coords.reduce((a, [, lat]) => Math.min(a, lat), Infinity);
    const maxLat = coords.reduce((a, [, lat]) => Math.max(a, lat), -Infinity);
    mapRef.current.fitBounds(
      [[minLng, minLat], [maxLng, maxLat]],
      { padding: 40, duration: 600 }
    );
  }, []);

  // data が変わったとき（マップ初期化済みの場合）にフィット
  useEffect(() => {
    if (!coloredGeoJson) return;
    fitToFeatures(coloredGeoJson.features);
  }, [coloredGeoJson, fitToFeatures]);

  // マップ初期化完了後にフィット（GeoJSON が先に届いていた場合の対処）
  const handleMapLoad = useCallback(() => {
    if (coloredGeoJson) fitToFeatures(coloredGeoJson.features);
  }, [coloredGeoJson, fitToFeatures]);

  // ホバー中の city_code に応じて opacity を上げた GeoJSON
  const displayGeoJson = useMemo<GeoJSONCollection | null>(() => {
    if (!coloredGeoJson || !hoverInfo) return coloredGeoJson;
    return {
      ...coloredGeoJson,
      features: coloredGeoJson.features.map((feature) => {
        if (featureCityCode(feature.properties) === hoverInfo.cityCode) {
          return {
            ...feature,
            properties: {
              ...feature.properties,
              fill_opacity: OPACITY_HOVER,
            },
          };
        }
        return feature;
      }),
    };
  }, [coloredGeoJson, hoverInfo]);

  const handleMouseMove = useCallback(
    (event: { point: { x: number; y: number }; features?: MapGeoJSONFeature[] }) => {
      const features = event.features;
      if (features && features.length > 0) {
        const feature = features[0];
        const props = feature.properties as GeoJSONProperties;
        setHoverInfo({
          x: event.point.x,
          y: event.point.y,
          cityCode: featureCityCode(props),
          cityName: props.city_name ?? props.N03_004,
        });
      } else {
        setHoverInfo(null);
      }
    },
    []
  );

  const handleMouseLeave = useCallback(() => {
    setHoverInfo(null);
  }, []);

  const handleClick = useCallback(
    (event: { features?: MapGeoJSONFeature[] }) => {
      if (!onCityClick) return;
      const f = event.features?.[0];
      if (f) {
        const props = f.properties as GeoJSONProperties;
        onCityClick(featureCityCode(props));
      }
    },
    [onCityClick]
  );

  if (geoLoading) {
    return <MapSkeleton />;
  }

  return (
    <div
      style={{
        position: "relative",
        height: "500px",
        borderRadius: "20px",
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <MapGL
        ref={(ref) => { if (ref) mapRef.current = ref.getMap() as unknown as MapLibreMap; }}
        initialViewState={INITIAL_VIEW}
        style={{ width: "100%", height: "100%" }}
        mapStyle={MAP_STYLE}
        interactiveLayerIds={["municipalities-fill"]}
        onLoad={handleMapLoad}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        cursor={hoverInfo ? "pointer" : "default"}
      >
        {displayGeoJson && (
          <Source id="municipalities" type="geojson" data={displayGeoJson}>
            <Layer
              id="municipalities-fill"
              type="fill"
              paint={{
                "fill-color": ["get", "fill_color"],
                "fill-opacity": ["get", "fill_opacity"],
              }}
            />
            <Layer
              id="municipalities-outline"
              type="line"
              paint={{
                "line-color": ["get", "fill_color"],
                "line-width": 0.8,
                "line-opacity": 0.6,
              }}
            />
          </Source>
        )}
      </MapGL>

      {hoverInfo && (
        <MapTooltip hoverInfo={hoverInfo} changeRateMap={changeRateMap} />
      )}

      <Legend />
    </div>
  );
}
