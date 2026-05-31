'use client';
import type { Map as MapLibreMap, MapGeoJSONFeature } from 'maplibre-gl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MapGL, { Layer, Source } from 'react-map-gl/maplibre';
import type { CityPriceDivergence, TownPriceDivergence } from '../types/divergence';
import { formatDivergenceRate, formatPrice } from '../utils/formatters';

type DivergenceItem = CityPriceDivergence | TownPriceDivergence;

interface Props {
  divergences: DivergenceItem[];
  selectedYear: number;
  prefCode: string;
  level: 'city' | 'town';
  cityCode?: string;
  onCityClick?: (cityCode: string) => void;
}

interface HoverInfo {
  x: number;
  y: number;
  featureKey: string;
  label: string;
}

interface GeoJSONProperties {
  city_code: string;
  city_name?: string;
  district_name?: string;
  N03_004?: string;
  fill_color?: string;
  fill_opacity?: number;
}

interface GeoJSONFeature {
  type: 'Feature';
  properties: GeoJSONProperties;
  geometry: object;
}

interface GeoJSONCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

const INITIAL_VIEW = { longitude: 139.6917, latitude: 35.6895, zoom: 8 };
const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
const OPACITY_NORMAL = 0.65;
const OPACITY_HOVER = 0.85;
const OPACITY_NODATA = 0.3;

function featureKey(cityCode: string, districtName?: string): string {
  return districtName ? `${cityCode}__${districtName}` : cityCode;
}

function getDivergenceColor(rate: number | undefined): string {
  if (rate === undefined) return '#334155';
  if (rate > 20)  return '#ef4444';
  if (rate > 10)  return '#f97316';
  if (rate > -10) return '#94a3b8';
  if (rate > -20) return '#60a5fa';
  return '#3b82f6';
}

function Legend() {
  const items = [
    { color: '#ef4444', label: '> +20%（大幅割高）' },
    { color: '#f97316', label: '+10〜20%（割高）' },
    { color: '#94a3b8', label: '±10%（概ね均衡）' },
    { color: '#60a5fa', label: '-10〜-20%（割安）' },
    { color: '#3b82f6', label: '< -20%（大幅割安）' },
  ];
  return (
    <div style={{ position: 'absolute', bottom: '24px', right: '12px', background: 'rgba(6,13,31,0.85)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '6px', zIndex: 1, pointerEvents: 'none' }}>
      {items.map((item) => (
        <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: item.color, flexShrink: 0 }} />
          <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

interface TooltipProps {
  hoverInfo: HoverInfo;
  divergenceMap: Map<string, DivergenceItem>;
}

function MapTooltip({ hoverInfo, divergenceMap }: TooltipProps) {
  const data = divergenceMap.get(hoverInfo.featureKey);
  return (
    <div style={{ position: 'absolute', left: hoverInfo.x + 12, top: hoverInfo.y - 12, background: 'rgba(6,13,31,0.96)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px 16px', minWidth: '200px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', pointerEvents: 'none', zIndex: 10 }}>
      <p style={{ fontSize: '13px', fontWeight: 700, color: '#e2e8f0', letterSpacing: '-0.02em', marginBottom: '8px' }}>
        {hoverInfo.label}
      </p>
      {data ? (
        <>
          <p style={{ fontSize: '20px', fontWeight: 700, color: getDivergenceColor(data.divergence_rate), letterSpacing: '-0.03em', lineHeight: 1, marginBottom: '8px' }}>
            {formatDivergenceRate(data.divergence_rate)}
          </p>
          <p style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
            公示平均地価 <span style={{ color: '#cbd5e1', fontWeight: 600 }}>{formatPrice(data.avg_published_price)}</span>
          </p>
          <p style={{ fontSize: '11px', color: '#94a3b8' }}>
            取引平均地価 <span style={{ color: '#cbd5e1', fontWeight: 600 }}>{formatPrice(data.avg_transaction_price)}</span>
          </p>
        </>
      ) : (
        <p style={{ fontSize: '12px', color: '#475569' }}>データなし</p>
      )}
    </div>
  );
}

export default function DivergenceMap({ divergences, selectedYear, prefCode, level, cityCode, onCityClick }: Props) {
  const [geoJson, setGeoJson] = useState<GeoJSONCollection | null>(null);
  const [geoLoading, setGeoLoading] = useState(true);
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);

  const geoJsonPath = level === 'town' ? '/geo/towns.geojson' : '/geo/municipalities.geojson';

  // level が変わったら GeoJSON を再取得
  useEffect(() => {
    setGeoLoading(true);
    setGeoJson(null);
    fetch(geoJsonPath)
      .then((res) => {
        if (!res.ok) throw new Error(`GeoJSON fetch failed: ${res.status}`);
        return res.json() as Promise<GeoJSONCollection>;
      })
      .then(setGeoJson)
      .catch((err: unknown) => console.error('GeoJSON fetch error:', err))
      .finally(() => setGeoLoading(false));
  }, [geoJsonPath]);

  const divergenceMap = useMemo(() => {
    const map = new Map<string, DivergenceItem>();
    for (const d of divergences) {
      const k = 'district_name' in d
        ? featureKey(d.city_code, d.district_name)
        : featureKey(d.city_code);
      map.set(k, d);
    }
    return map;
  }, [divergences]);

  const coloredGeoJson = useMemo<GeoJSONCollection | null>(() => {
    if (!geoJson) return null;
    const filterFn = (cityCode && level === 'town')
      ? (f: GeoJSONFeature) => f.properties.city_code === cityCode
      : (f: GeoJSONFeature) => f.properties.city_code.startsWith(prefCode);
    return {
      ...geoJson,
      features: geoJson.features
        .filter(filterFn)
        .map((feature) => {
          const k = level === 'town'
            ? featureKey(feature.properties.city_code, feature.properties.district_name)
            : featureKey(feature.properties.city_code);
          const data = divergenceMap.get(k);
          return {
            ...feature,
            properties: {
              ...feature.properties,
              fill_color: getDivergenceColor(data?.divergence_rate),
              fill_opacity: data !== undefined ? OPACITY_NORMAL : OPACITY_NODATA,
            },
          };
        }),
    };
  }, [geoJson, divergenceMap, prefCode, level, cityCode]);

  const fitToFeatures = useCallback((features: GeoJSONCollection['features']) => {
    if (!mapRef.current) return;
    const coords: [number, number][] = [];
    for (const f of features) {
      const geom = f.geometry as { type: string; coordinates: unknown };
      if (!geom) continue;
      const rings =
        geom.type === 'Polygon'
          ? (geom.coordinates as [number, number][][])
          : geom.type === 'MultiPolygon'
          ? (geom.coordinates as [number, number][][][]).flat()
          : [];
      for (const ring of rings) {
        for (const [lng, lat] of ring) {
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

  useEffect(() => {
    if (!coloredGeoJson) return;
    fitToFeatures(coloredGeoJson.features);
  }, [coloredGeoJson, fitToFeatures]);

  const handleMapLoad = useCallback(() => {
    if (coloredGeoJson) fitToFeatures(coloredGeoJson.features);
  }, [coloredGeoJson, fitToFeatures]);

  const displayGeoJson = useMemo<GeoJSONCollection | null>(() => {
    if (!coloredGeoJson || !hoverInfo) return coloredGeoJson;
    return {
      ...coloredGeoJson,
      features: coloredGeoJson.features.map((feature) => {
        const k = level === 'town'
          ? featureKey(feature.properties.city_code, feature.properties.district_name)
          : featureKey(feature.properties.city_code);
        return k === hoverInfo.featureKey
          ? { ...feature, properties: { ...feature.properties, fill_opacity: OPACITY_HOVER } }
          : feature;
      }),
    };
  }, [coloredGeoJson, hoverInfo, level]);

  const handleMouseMove = useCallback(
    (event: { point: { x: number; y: number }; features?: MapGeoJSONFeature[] }) => {
      const features = event.features;
      if (features && features.length > 0) {
        const props = features[0].properties as GeoJSONProperties;
        const k = level === 'town'
          ? featureKey(props.city_code, props.district_name)
          : featureKey(props.city_code);
        const label = level === 'town'
          ? `${props.city_name ?? ''} ${props.district_name ?? ''}`
          : (props.city_name ?? props.N03_004 ?? '');
        setHoverInfo({ x: event.point.x, y: event.point.y, featureKey: k, label });
      } else {
        setHoverInfo(null);
      }
    },
    [level]
  );

  const handleMouseLeave = useCallback(() => setHoverInfo(null), []);

  const handleClick = useCallback(
    (event: { features?: MapGeoJSONFeature[] }) => {
      if (!onCityClick || level !== 'city') return;
      const f = event.features?.[0];
      if (f) {
        const props = f.properties as GeoJSONProperties;
        onCityClick(props.city_code);
      }
    },
    [onCityClick, level]
  );

  if (geoLoading) {
    return <div style={{ height: '500px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }} />;
  }

  return (
    <div style={{ position: 'relative', height: '500px', borderRadius: '20px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)' }}>
      <MapGL
        ref={(ref) => { if (ref) mapRef.current = ref.getMap() as unknown as MapLibreMap; }}
        initialViewState={INITIAL_VIEW}
        style={{ width: '100%', height: '100%' }}
        mapStyle={MAP_STYLE}
        interactiveLayerIds={['divergence-fill']}
        onLoad={handleMapLoad}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        cursor={hoverInfo ? 'pointer' : 'default'}
      >
        {displayGeoJson && (
          <Source id="divergence-municipalities" type="geojson" data={displayGeoJson}>
            <Layer id="divergence-fill" type="fill" paint={{ 'fill-color': ['get', 'fill_color'], 'fill-opacity': ['get', 'fill_opacity'] }} />
            <Layer id="divergence-outline" type="line" paint={{ 'line-color': ['get', 'fill_color'], 'line-width': 0.8, 'line-opacity': 0.6 }} />
          </Source>
        )}
      </MapGL>
      {hoverInfo && <MapTooltip hoverInfo={hoverInfo} divergenceMap={divergenceMap} />}
      <div style={{ position: 'absolute', top: '12px', left: '12px', background: 'rgba(6,13,31,0.8)', borderRadius: '8px', padding: '6px 10px', fontSize: '12px', color: '#94a3b8', pointerEvents: 'none' }}>
        {selectedYear}年
      </div>
      <Legend />
    </div>
  );
}
