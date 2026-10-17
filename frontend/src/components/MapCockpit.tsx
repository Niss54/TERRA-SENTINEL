import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Cpu } from 'lucide-react';
import { cockpitClient, type FrameBudgetEvaluation } from '../utils/cockpitClient';

export interface MapCockpitProps {
  lat: number;
  lon: number;
  locationName: string;
  riskTier?: string;
  inundationDepthCm?: number;
  soilSaturationPct?: number;
  precipitation24hMm?: number;
  className?: string;
}

export const MapCockpit: React.FC<MapCockpitProps> = ({
  lat,
  lon,
  locationName,
  riskTier = 'HIGH',
  inundationDepthCm = 85,
  soilSaturationPct = 82,
  precipitation24hMm = 95,
  className = '',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layersGroupRef = useRef<L.LayerGroup | null>(null);

  const [fps, setFps] = useState<number>(60);
  const [frameTimeMs, setFrameTimeMs] = useState<number>(16.1);
  const [is60Fps, setIs60Fps] = useState<boolean>(true);
  const [frameEvaluation, setFrameEvaluation] = useState<FrameBudgetEvaluation | null>(null);

  // Layer toggles
  const [showCoreBasin, setShowCoreBasin] = useState(true);
  const [showPerimeter, setShowPerimeter] = useState(true);
  const [showDrainageCanals, setShowDrainageCanals] = useState(true);
  const [showAssetPins, setShowAssetPins] = useState(true);
  const [showContours, setShowContours] = useState(false);

  // 1. Subscribe to 60fps Frame Budget Monitor
  useEffect(() => {
    cockpitClient.frameMonitor.start();
    const unsubscribe = cockpitClient.frameMonitor.subscribe((currentFps, currentFrameTime, compliant) => {
      setFps(currentFps);
      setFrameTimeMs(Math.round(currentFrameTime * 10) / 10);
      setIs60Fps(compliant);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // 2. Initialize Leaflet CartoDB Map with preferCanvas: true for 60fps rendering
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [lat, lon],
        zoom: 13,
        zoomControl: false,
        preferCanvas: true, // Critical for 60fps vector rendering budget
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; CartoDB &copy; OpenStreetMap contributors',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(map);

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      const layersGroup = L.layerGroup().addTo(map);
      layersGroupRef.current = layersGroup;
      mapInstanceRef.current = map;
    } else {
      mapInstanceRef.current.setView([lat, lon], 13);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [lat, lon]);

  // 3. Render Vector Overlays conforming to 60fps Frame Budget
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = layersGroupRef.current;
    if (!map || !group) return;

    const renderStart = performance.now();
    group.clearLayers();

    let vertexCount = 0;

    // A. Core Inundation Zone (Red/Amber Polygon)
    if (showCoreBasin) {
      const corePolygon = L.circle([lat, lon], {
        radius: 1200,
        color: '#EF4444',
        weight: 2,
        fillColor: '#EF4444',
        fillOpacity: 0.25,
      }).bindPopup(
        `<div style="color: #0F172A; font-family: sans-serif; font-size: 12px;">
          <b>Core Inundation Zone</b><br/>
          Depth: ${inundationDepthCm} cm<br/>
          Hazard Tier: <span style="color: #EF4444; font-weight: bold;">${riskTier}</span>
        </div>`
      );
      group.addLayer(corePolygon);
      vertexCount += 64;
    }

    // B. Secondary Impact Perimeter
    if (showPerimeter) {
      const perimeter = L.circle([lat, lon], {
        radius: 2500,
        color: '#F59E0B',
        weight: 1.5,
        dashArray: '6, 6',
        fillColor: '#F59E0B',
        fillOpacity: 0.08,
      });
      group.addLayer(perimeter);
      vertexCount += 64;
    }

    // C. Stormwater Drainage Canals
    if (showDrainageCanals) {
      const canalCoords: [number, number][] = [
        [lat - 0.012, lon - 0.015],
        [lat - 0.005, lon - 0.005],
        [lat + 0.002, lon + 0.008],
        [lat + 0.015, lon + 0.02],
      ];
      const canalPolyline = L.polyline(canalCoords, {
        color: '#06B6D4',
        weight: 3,
        opacity: 0.8,
      }).bindPopup('<b>Primary Stormwater Drainage Conduit</b><br/>Status: 82% Capacity Overflow');
      group.addLayer(canalPolyline);
      vertexCount += canalCoords.length;
    }

    // D. Critical Asset Pins
    if (showAssetPins) {
      const assetIcon = L.divIcon({
        className: 'custom-asset-icon',
        html: `<div style="
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #10B981;
          border: 2px solid #FFFFFF;
          box-shadow: 0 0 10px #10B981;
        "></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      const pinCoords: [number, number, string][] = [
        [lat + 0.006, lon - 0.008, 'Substation Alpha (Lifeline)'],
        [lat - 0.008, lon + 0.006, 'Municipal Water Pump Station'],
        [lat + 0.003, lon + 0.011, 'General Hospital Aux Power Vault'],
      ];

      pinCoords.forEach(([pLat, pLon, pName]) => {
        const marker = L.marker([pLat, pLon], { icon: assetIcon }).bindPopup(
          `<b>${pName}</b><br/>Lifeline Clearance: 1.2m`
        );
        group.addLayer(marker);
        vertexCount += 1;
      });
    }

    // E. 30m Elevation Topo Contours (Synthetic SRTM)
    if (showContours) {
      const contourCoords: [number, number][] = [
        [lat - 0.018, lon - 0.018],
        [lat - 0.012, lon - 0.002],
        [lat - 0.006, lon + 0.016],
        [lat + 0.008, lon + 0.022],
      ];
      const contourLine = L.polyline(contourCoords, {
        color: '#6366F1',
        weight: 1.5,
        dashArray: '3, 4',
      });
      group.addLayer(contourLine);
      vertexCount += contourCoords.length;
    }

    const renderEnd = performance.now();
    const renderDuration = renderEnd - renderStart;

    // Evaluate against FrameBudget <= 16.67ms
    const evalResult = cockpitClient.evaluateFrameBudgetLocal(renderDuration, vertexCount);
    setFrameEvaluation(evalResult);
  }, [
    lat,
    lon,
    locationName,
    riskTier,
    inundationDepthCm,
    showCoreBasin,
    showPerimeter,
    showDrainageCanals,
    showAssetPins,
    showContours,
  ]);

  return (
    <div className={`relative w-full h-[520px] rounded-xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl ${className}`}>
      {/* 1. Leaflet Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* 2. 60 FPS Mission-Control HUD Benchmark (Top-Right) */}
      <div className="absolute top-3 right-3 z-[1000] flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3.5 py-1.5 rounded-lg border border-slate-700/60 shadow-lg text-xs">
        <div className="flex items-center gap-1.5 font-mono">
          <span
            className={`w-2.5 h-2.5 rounded-full animate-pulse ${
              is60Fps ? 'bg-emerald-400' : 'bg-amber-400'
            }`}
          />
          <span className="font-bold text-slate-100">{fps} FPS</span>
          <span className="text-slate-400">({frameTimeMs} ms)</span>
        </div>
        <div className="h-3 w-px bg-slate-700" />
        <span
          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wider ${
            is60Fps
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
          }`}
        >
          {is60Fps ? 'FRAME_BUDGET: OK' : 'BUDGET: THROTTLED'}
        </span>
      </div>

      {/* 3. Location & Tactical Status Overlay (Top-Left) */}
      <div className="absolute top-3 left-3 z-[1000] bg-slate-900/90 backdrop-blur-md px-3.5 py-2 rounded-lg border border-slate-700/60 shadow-lg max-w-xs">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 mb-0.5">
          <Cpu className="w-3.5 h-3.5" />
          <span>PHASE 18 · MISSION-CONTROL COCKPIT</span>
        </div>
        <div className="text-sm font-bold text-slate-100 truncate">{locationName}</div>
        <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400">
          <span>Depth: <b className="text-slate-200">{inundationDepthCm} cm</b></span>
          <span>Rain: <b className="text-slate-200">{precipitation24hMm} mm</b></span>
          <span>Soil: <b className="text-slate-200">{soilSaturationPct}%</b></span>
        </div>
      </div>

      {/* 4. Interactive GIS Layer Controls (Bottom-Left) */}
      <div className="absolute bottom-3 left-3 z-[1000] flex flex-wrap items-center gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-lg border border-slate-700/60 shadow-lg text-[11px]">
        <button
          onClick={() => setShowCoreBasin(!showCoreBasin)}
          className={`px-2 py-1 rounded transition-colors ${
            showCoreBasin
              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
              : 'bg-slate-800 text-slate-400'
          }`}
        >
          Core Basin
        </button>
        <button
          onClick={() => setShowPerimeter(!showPerimeter)}
          className={`px-2 py-1 rounded transition-colors ${
            showPerimeter
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              : 'bg-slate-800 text-slate-400'
          }`}
        >
          Perimeter
        </button>
        <button
          onClick={() => setShowDrainageCanals(!showDrainageCanals)}
          className={`px-2 py-1 rounded transition-colors ${
            showDrainageCanals
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
              : 'bg-slate-800 text-slate-400'
          }`}
        >
          Drainage Canals
        </button>
        <button
          onClick={() => setShowAssetPins(!showAssetPins)}
          className={`px-2 py-1 rounded transition-colors ${
            showAssetPins
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'bg-slate-800 text-slate-400'
          }`}
        >
          Asset Pins
        </button>
        <button
          onClick={() => setShowContours(!showContours)}
          className={`px-2 py-1 rounded transition-colors ${
            showContours
              ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
              : 'bg-slate-800 text-slate-400'
          }`}
        >
          SRTM 30m DEM
        </button>
      </div>

      {/* 5. Invariant Badge (Bottom-Right) */}
      {frameEvaluation && (
        <div className="absolute bottom-3 right-12 z-[1000] bg-slate-900/80 backdrop-blur-md px-2.5 py-1 rounded border border-slate-700/50 text-[10px] text-slate-400 hidden sm:block">
          Budget: <span className="font-mono text-slate-200">{frameEvaluation.budget_utilization_pct}%</span> · Vertices: <span className="font-mono text-slate-200">{frameEvaluation.vertex_count}</span>
        </div>
      )}
    </div>
  );
};
