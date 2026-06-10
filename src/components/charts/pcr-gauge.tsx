'use client';

/**
 * PCR semi-circle gauge — pure SVG, no dependencies.
 * Shows the PCR value on a coloured arc with BREACH / WATCH / GREEN zones.
 * Interactive: hovering a zone shows a tooltip with zone details.
 *
 * Zones (from the finance engine):
 *   < 1.00  → BREACH (red)
 *   1.00–1.25 → WATCH (amber)
 *   >= 1.25  → GREEN (emerald)
 *
 * The gauge maps 0.00x → 2.00x onto a 180-degree arc.
 */

import { useState, useRef } from 'react';

interface Props {
  pcr: number;          // e.g. 1.18
  status: string;       // 'GREEN' | 'WATCH' | 'BREACH'
  liquidAssets: string; // formatted GHS string for subtitle
  size?: number;
}

type HoveredZone = 'BREACH' | 'WATCH' | 'GREEN' | null;

const ZONE_INFO: Record<string, { label: string; range: string; description: string }> = {
  BREACH: { label: 'BREACH', range: '< 1.00x', description: 'Liquid assets insufficient to cover investor principal' },
  WATCH: { label: 'WATCH', range: '1.00x – 1.25x', description: 'Coverage adequate but below comfort threshold' },
  GREEN: { label: 'GREEN', range: '≥ 1.25x', description: 'Healthy coverage — liquid assets exceed principal due' },
};

export function PCRGauge({ pcr, status, liquidAssets, size = 240 }: Props) {
  const [hovered, setHovered] = useState<HoveredZone>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const cx = size / 2;
  const cy = size / 2 + 10;
  const r = size / 2 - 20;

  // Map PCR 0..2 onto angle π..0 (left to right)
  const maxPCR = 2.0;
  const clampedPCR = Math.min(Math.max(pcr, 0), maxPCR);
  const needleAngle = Math.PI - (clampedPCR / maxPCR) * Math.PI;

  // Helper: angle to SVG point on arc
  const arcPoint = (angle: number, radius: number) => ({
    x: cx + radius * Math.cos(angle),
    y: cy - radius * Math.sin(angle),
  });

  // Arc path helper
  const arcPath = (startAngle: number, endAngle: number, radius: number) => {
    const start = arcPoint(startAngle, radius);
    const end = arcPoint(endAngle, radius);
    const largeArc = Math.abs(startAngle - endAngle) > Math.PI ? 1 : 0;
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 0 ${end.x} ${end.y}`;
  };

  // Zone boundaries in angle space
  const breachEnd = Math.PI / 2;     // PCR < 1.00
  const watchEnd = 0.375 * Math.PI;  // PCR < 1.25

  const trackWidth = 14;
  const hoverTrackWidth = 20;
  const needle = arcPoint(needleAngle, r);

  // Status colour for needle
  const needleColor = status === 'GREEN' ? '#059669' : status === 'WATCH' ? '#d97706' : '#dc2626';

  function handleZoneHover(zone: HoveredZone, e: React.MouseEvent) {
    setHovered(zone);
    if (containerRef.current && zone) {
      const rect = containerRef.current.getBoundingClientRect();
      setTooltipPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top - 10,
      });
    }
  }

  function handleZoneMove(e: React.MouseEvent) {
    if (containerRef.current && hovered) {
      const rect = containerRef.current.getBoundingClientRect();
      setTooltipPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top - 10,
      });
    }
  }

  return (
    <div className="relative flex flex-col items-center" ref={containerRef}>
      <svg
        width={size}
        height={size / 2 + 30}
        viewBox={`0 0 ${size} ${size / 2 + 30}`}
        aria-label={`PCR gauge: ${pcr.toFixed(2)}x`}
      >
        {/* BREACH zone (red) — π to π/2 */}
        <path
          d={arcPath(Math.PI, breachEnd, r)}
          fill="none"
          stroke={hovered === 'BREACH' ? '#fca5a5' : '#fecaca'}
          strokeWidth={hovered === 'BREACH' ? hoverTrackWidth : trackWidth}
          strokeLinecap="round"
          className="cursor-pointer transition-all duration-150"
          onMouseEnter={(e) => handleZoneHover('BREACH', e)}
          onMouseMove={handleZoneMove}
          onMouseLeave={() => setHovered(null)}
        />
        {/* Invisible wider hit area for BREACH */}
        <path
          d={arcPath(Math.PI, breachEnd, r)}
          fill="none"
          stroke="transparent"
          strokeWidth={30}
          className="cursor-pointer"
          onMouseEnter={(e) => handleZoneHover('BREACH', e)}
          onMouseMove={handleZoneMove}
          onMouseLeave={() => setHovered(null)}
        />

        {/* WATCH zone (amber) — π/2 to 0.375π */}
        <path
          d={arcPath(breachEnd, watchEnd, r)}
          fill="none"
          stroke={hovered === 'WATCH' ? '#fcd34d' : '#fde68a'}
          strokeWidth={hovered === 'WATCH' ? hoverTrackWidth : trackWidth}
          strokeLinecap="butt"
          className="cursor-pointer transition-all duration-150"
          onMouseEnter={(e) => handleZoneHover('WATCH', e)}
          onMouseMove={handleZoneMove}
          onMouseLeave={() => setHovered(null)}
        />
        <path
          d={arcPath(breachEnd, watchEnd, r)}
          fill="none"
          stroke="transparent"
          strokeWidth={30}
          className="cursor-pointer"
          onMouseEnter={(e) => handleZoneHover('WATCH', e)}
          onMouseMove={handleZoneMove}
          onMouseLeave={() => setHovered(null)}
        />

        {/* GREEN zone — 0.375π to 0 */}
        <path
          d={arcPath(watchEnd, 0, r)}
          fill="none"
          stroke={hovered === 'GREEN' ? '#86efac' : '#bbf7d0'}
          strokeWidth={hovered === 'GREEN' ? hoverTrackWidth : trackWidth}
          strokeLinecap="round"
          className="cursor-pointer transition-all duration-150"
          onMouseEnter={(e) => handleZoneHover('GREEN', e)}
          onMouseMove={handleZoneMove}
          onMouseLeave={() => setHovered(null)}
        />
        <path
          d={arcPath(watchEnd, 0, r)}
          fill="none"
          stroke="transparent"
          strokeWidth={30}
          className="cursor-pointer"
          onMouseEnter={(e) => handleZoneHover('GREEN', e)}
          onMouseMove={handleZoneMove}
          onMouseLeave={() => setHovered(null)}
        />

        {/* Tick labels */}
        {[0, 0.5, 1.0, 1.25, 1.5, 2.0].map((val) => {
          const angle = Math.PI - (val / maxPCR) * Math.PI;
          const pt = arcPoint(angle, r + 18);
          return (
            <text
              key={val}
              x={pt.x}
              y={pt.y}
              textAnchor="middle"
              dominantBaseline="middle"
              style={{ fontSize: 10, fill: '#69707a' }}
            >
              {val.toFixed(val === 1.25 ? 2 : 1)}x
            </text>
          );
        })}

        {/* Needle */}
        <line
          x1={cx}
          y1={cy}
          x2={needle.x}
          y2={needle.y}
          stroke={needleColor}
          strokeWidth={3}
          strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r={5} fill={needleColor} />

        {/* Center value */}
        <text
          x={cx}
          y={cy - 18}
          textAnchor="middle"
          style={{ fontSize: 24, fontWeight: 700, fill: needleColor }}
        >
          {pcr.toFixed(2)}x
        </text>
      </svg>

      {/* Tooltip */}
      {hovered && (
        <div
          className="chart-tooltip pointer-events-none absolute z-50 rounded-md border border-brand-line bg-white px-3 py-2 shadow-lg"
          style={{
            left: tooltipPos.x,
            top: tooltipPos.y,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{
                backgroundColor: hovered === 'BREACH' ? '#dc2626' : hovered === 'WATCH' ? '#d97706' : '#059669',
              }}
            />
            <span className="text-xs font-bold">{ZONE_INFO[hovered].label}</span>
            <span className="text-xs text-brand-muted">{ZONE_INFO[hovered].range}</span>
          </div>
          <p className="mt-1 text-[11px] text-brand-muted">{ZONE_INFO[hovered].description}</p>
          {hovered === status && (
            <p className="mt-1 text-[11px] font-semibold" style={{ color: needleColor }}>
              ← Current: {pcr.toFixed(2)}x
            </p>
          )}
        </div>
      )}

      <p className="mt-1 text-xs text-brand-muted">Liquid assets: {liquidAssets}</p>
    </div>
  );
}
