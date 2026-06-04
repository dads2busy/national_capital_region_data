'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet'
import L from 'leaflet'
import type { Layer, LeafletMouseEvent, PathOptions } from 'leaflet'
import { useDashboardStore } from '@/lib/store'
import { selectShapes, selectPalette } from '@/lib/store/selectors'
import { useData } from '@/components/DataProvider'
import { getRegionValues, computeSummary } from '@/lib/data/aggregation'
import { valueToColor, getNAColor } from '@/lib/color/scale'
import { loadGeoJson } from '@/lib/data/loader'
import { resolveEntityName } from '@/lib/data/entity-resolver'
import { mapDefaults, tileSources, mapShapeSources } from '@/lib/config/map-shapes'
import type { GeoJSONFeatureCollection, GeoJSONFeature, ShapeLevel } from '@/lib/data/types'
import 'leaflet/dist/leaflet.css'

/** Build a path lookup from map-shapes config */
const geoPathsByLevel: Record<string, string> = {}
for (const src of mapShapeSources) {
  geoPathsByLevel[src.name] = src.localPath
}

/** Component to handle map view changes */
function MapController({ bounds }: { bounds: L.LatLngBounds | null }) {
  const map = useMap()
  const mapAnimations = useDashboardStore((s) => s.settings.mapAnimations)

  useEffect(() => {
    if (bounds) {
      const opts = { padding: [20, 20] as [number, number] }
      if (mapAnimations === 'fly') {
        map.flyToBounds(bounds, opts)
      } else if (mapAnimations === 'zoom') {
        map.fitBounds(bounds, { ...opts, animate: true })
      } else {
        map.fitBounds(bounds, { ...opts, animate: false })
      }
    } else {
      if (mapAnimations === 'fly') {
        map.flyTo(mapDefaults.center, mapDefaults.zoom)
      } else if (mapAnimations === 'zoom') {
        map.setView(mapDefaults.center, mapDefaults.zoom, { animate: true })
      } else {
        map.setView(mapDefaults.center, mapDefaults.zoom, { animate: false })
      }
    }
  }, [map, bounds, mapAnimations])

  return null
}

export function MapInner() {
  const shapes = useDashboardStore(selectShapes)
  const paletteName = useDashboardStore(selectPalette)
  const selectedVariable = useDashboardStore((s) => s.selectedVariable)
  const selectedYear = useDashboardStore((s) => s.selectedYear)
  const selectedLayer = useDashboardStore((s) => s.selectedLayer)
  const themeDark = useDashboardStore((s) => s.settings.themeDark)
  const polygonOutline = useDashboardStore((s) => s.settings.polygonOutline)
  const colorScaleCenter = useDashboardStore((s) => s.settings.colorScaleCenter)
  const colorByOrder = useDashboardStore((s) => s.settings.colorByOrder)
  const setHoveredRegionId = useDashboardStore((s) => s.setHoveredRegionId)
  const setSelectedRegionId = useDashboardStore((s) => s.setSelectedRegionId)
  const setSelectedCounty = useDashboardStore((s) => s.setSelectedCounty)
  const setSelectedTract = useDashboardStore((s) => s.setSelectedTract)
  const hoveredRegionId = useDashboardStore((s) => s.hoveredRegionId)
  const selectedCounty = useDashboardStore((s) => s.selectedCounty)
  const selectedTract = useDashboardStore((s) => s.selectedTract)

  const { activeDataset, entityInfo } = useData()

  const [geoData, setGeoData] = useState<Record<string, GeoJSONFeatureCollection>>({})
  const [mapBounds, setMapBounds] = useState<L.LatLngBounds | null>(null)

  // Stable handle to the active GeoJSON layer + an index of per-feature layers by geoid.
  // These let us recolor / highlight imperatively instead of remounting all features.
  const geoJsonRef = useRef<L.GeoJSON | null>(null)
  const layersByIdRef = useRef<Map<string, L.Path>>(new Map())
  const prevHoveredRef = useRef<string | null>(null)

  // Adjust map bounds when county/tract selection changes
  const prevCounty = useRef(selectedCounty)
  const prevTract = useRef(selectedTract)
  useEffect(() => {
    const countyCleared = prevCounty.current && !selectedCounty
    const tractCleared = prevTract.current && !selectedTract
    const countySet = !prevCounty.current && selectedCounty
    const countyChanged = prevCounty.current && selectedCounty && prevCounty.current !== selectedCounty

    if (countyCleared) {
      // Went all the way back to county overview
      setMapBounds(null)
    } else if (tractCleared && selectedCounty && geoData.county) {
      // Went back from block_group to tract: re-zoom to the selected county
      const feature = geoData.county.features.find(
        (f) => f.properties.geoid === selectedCounty
      )
      if (feature) {
        const layer = L.geoJSON(feature as GeoJSON.Feature)
        setMapBounds(layer.getBounds())
      }
    } else if ((countySet || countyChanged) && geoData.county) {
      // County selected (from dropdown or map click): zoom to it
      const feature = geoData.county.features.find(
        (f) => f.properties.geoid === selectedCounty
      )
      if (feature) {
        const layer = L.geoJSON(feature as GeoJSON.Feature)
        setMapBounds(layer.getBounds())
      }
    }

    prevCounty.current = selectedCounty
    prevTract.current = selectedTract
  }, [selectedCounty, selectedTract, geoData.county])

  // Load GeoJSON shapes for the current level
  useEffect(() => {
    const path = geoPathsByLevel[shapes]
    if (path && !geoData[shapes]) {
      loadGeoJson(path).then((data) => {
        setGeoData((prev) => ({ ...prev, [shapes]: data }))
      })
    }
    // Also load county boundaries for tract/block_group overlay
    if ((shapes === 'tract' || shapes === 'block_group') && !geoData.county) {
      loadGeoJson(geoPathsByLevel.county).then((data) => {
        setGeoData((prev) => ({ ...prev, county: data }))
      })
    }
  }, [shapes, geoData])

  // Compute region values and summary for coloring
  const { regionValues, summary, sortedValues } = useMemo(() => {
    if (!activeDataset) return { regionValues: new Map<string, number>(), summary: null, sortedValues: [] }

    const meta = activeDataset._meta
    const timeOffset = selectedYear - meta.time.value[0]

    const values = getRegionValues(activeDataset, selectedVariable, timeOffset)
    const summ = computeSummary(activeDataset, selectedVariable, timeOffset)
    const sorted = Array.from(values.values()).sort((a, b) => a - b)

    return { regionValues: values, summary: summ, sortedValues: sorted }
  }, [activeDataset, selectedVariable, selectedYear])

  const css = typeof document !== 'undefined' ? getComputedStyle(document.documentElement) : null
  const borderColor = css?.getPropertyValue('--border-map').trim() || (themeDark ? '#475569' : '#94a3b8')
  const hoverBorderColor = css?.getPropertyValue('--border-map-hover').trim() || '#93c5fd'

  // Style function for GeoJSON features
  const styleFeature = useCallback(
    (feature?: GeoJSONFeature): PathOptions => {
      if (!feature || !summary) {
        return { fillColor: getNAColor(themeDark), weight: polygonOutline, color: borderColor, fillOpacity: 0.7 }
      }

      const regionId = feature.properties.geoid
      const value = regionValues.get(regionId)

      const fillColor =
        value !== undefined
          ? valueToColor(value, summary, paletteName, colorScaleCenter, colorByOrder, sortedValues)
          : getNAColor(themeDark)

      // Base style only. Hover highlight is applied imperatively (see applyHover) so that
      // hovering does not force a recolor of every feature.
      return {
        fillColor,
        weight: polygonOutline,
        color: borderColor,
        fillOpacity: 0.7,
        opacity: 1,
      }
    },
    [summary, regionValues, paletteName, colorScaleCenter, colorByOrder, sortedValues, themeDark, polygonOutline, borderColor]
  )

  // Event handlers for features
  const onEachFeature = useCallback(
    (feature: GeoJSONFeature, layer: Layer) => {
      layersByIdRef.current.set(feature.properties.geoid, layer as L.Path)
      layer.on({
        mouseover: () => {
          const id = feature.properties.geoid
          const name = resolveEntityName(entityInfo, id, shapes)
          setHoveredRegionId(id, name)
        },
        mouseout: () => {
          setHoveredRegionId(null)
        },
        click: (e: LeafletMouseEvent) => {
          const id = feature.properties.geoid
          // Drill-down only for county layer: county → tract → block_group
          if (selectedLayer === 'county' && shapes === 'county') {
            setMapBounds((e.target as L.Polygon).getBounds())
            setSelectedCounty(id)
          } else if (selectedLayer === 'county' && shapes === 'tract') {
            setMapBounds((e.target as L.Polygon).getBounds())
            setSelectedTract(id)
          } else {
            // All other layers: just select the region
            setSelectedRegionId(id)
          }
        },
      })
    },
    [shapes, selectedLayer, entityInfo, setHoveredRegionId, setSelectedCounty, setSelectedTract, setSelectedRegionId]
  )

  // Apply / clear the hover highlight on a single feature layer (O(1) per hover).
  const applyHover = useCallback(
    (id: string | null) => {
      const layers = layersByIdRef.current
      const prev = prevHoveredRef.current
      if (prev && prev !== id) {
        layers.get(prev)?.setStyle({ weight: polygonOutline, color: borderColor })
      }
      if (id) {
        const target = layers.get(id)
        if (target) {
          target.setStyle({ weight: polygonOutline + 2, color: hoverBorderColor })
          target.bringToFront()
        }
      }
      prevHoveredRef.current = id
    },
    [polygonOutline, borderColor, hoverBorderColor]
  )

  // Highlight the hovered region (driven by hover on the map OR the table) without
  // rebuilding any layers.
  useEffect(() => {
    applyHover(hoveredRegionId)
  }, [hoveredRegionId, applyHover])

  // Recolor the existing layer in place when coloring inputs change, instead of
  // remounting all features via a changing `key`.
  useEffect(() => {
    const layer = geoJsonRef.current
    if (!layer) return
    layer.setStyle(styleFeature as L.StyleFunction)
    // setStyle resets every feature to its base style, so re-apply the current hover.
    const hovered = prevHoveredRef.current
    if (hovered) {
      layersByIdRef.current.get(hovered)?.setStyle({ weight: polygonOutline + 2, color: hoverBorderColor })
    }
  }, [styleFeature, polygonOutline, hoverBorderColor])

  const currentGeoJson = geoData[shapes]
  const showCountyOverlay = shapes === 'tract' || shapes === 'block_group'
  const countyOverlayGeoJson = showCountyOverlay ? geoData.county : null
  const tileUrl = themeDark ? tileSources.dark : tileSources.light

  const overlayColor = css?.getPropertyValue('--border-map-overlay').trim() || (themeDark ? '#e2e8f0' : '#1e293b')
  const countyOverlayStyle: PathOptions = {
    fillOpacity: 0,
    weight: 2.5,
    color: overlayColor,
    opacity: 0.8,
  }

  return (
    <MapContainer
      preferCanvas
      center={mapDefaults.center}
      zoom={mapDefaults.zoom}
      zoomSnap={0.1}
      scrollWheelZoom={false}
      style={{ height: mapDefaults.height, width: '100%', background: 'var(--surface-dark)' }}
      attributionControl={false}
    >
      <TileLayer url={tileUrl} />
      <MapController bounds={mapBounds} />
      {currentGeoJson && (
        <GeoJSON
          // Rebuild only when the underlying geography changes. Recoloring and hover
          // highlighting are handled imperatively (setStyle) to avoid remounting all features.
          key={shapes}
          ref={geoJsonRef}
          data={currentGeoJson}
          style={styleFeature as (feature?: GeoJSON.Feature) => PathOptions}
          onEachFeature={onEachFeature as (feature: GeoJSON.Feature, layer: Layer) => void}
        />
      )}
      {countyOverlayGeoJson && (
        <GeoJSON
          key={`county-overlay-${themeDark}`}
          data={countyOverlayGeoJson}
          style={() => countyOverlayStyle}
          interactive={false}
        />
      )}
    </MapContainer>
  )
}
