'use client';

/**
 * NAV composition horizontal stacked bar — pure SVG with interactive hover tooltips.
 *
 * Shows how the fund's Net Asset Value breaks down across:
 *   Protection sleeve, Reserve, Market Alpha, Operating Alpha,
 *   Loan Book (net of provisions), Cash.
 *
 * A thin red marker shows the investor principal due threshold.
 */

import { useState, useCallback } from 'react';

export interface NavSegment {
  label: string;
  value: number;
  color: string;
}

interface Props {
  segments: NavSegment[];
  principalDue: number;
  totalNAV: number;
}

export function NavBreakdownBar({ segments, principalDue, totalNAV }: Props) {
  const [hover, setHover] = useState<{ label: string; value: number; pct: number; x: number; y: number } | null>(null);
  const barWidth = 480;
  const barHeight = 32;
  const svgWidth = barWidth + 40;
  const svgHeight = 110;
  const barY = 12;

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGRectElement>, bar: { label: string; value: number; pct: number }) => {
    const svg = (e.target as SVGElement).closest('svg');
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    setHover({
      label: bar.label,
      value: bar.value,
      pct: bar.pct,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }, []);

  const total = segments.reduce((sum, s) => sum + Math.max(s.value, 0), 0);
  if (total === 0) {
    return <p className="text-sm text-brand-muted">No NAV data</p>;
  }

  const bars = segments
    .filter((s) => s.value > 0)
    .reduce<Array<NavSegment & { x: number; w: number; pct: number }>>((acc, seg) => {
      const x = acc.length === 0 ? 20 : acc[acc.length - 1].x + acc[acc.length - 1].w;
      const w = (seg.value / total) * barWidth;
      acc.push({ ...seg, x, w, pct: seg.value / total });
      return acc;
    }, []);

  const markerX = principalDue > 0 ? 20 + Math.min(principalDue / total, 1) * barWidth : null;

  return (
    <div className="relative w-full overflow-x-auto">
      <svg
        width="100%"
        height={svgHeight}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        preserveAspectRatio="xMinYMin meet"
        aria-label="NAV breakdown chart"
        onMouseLeave={() => setHover(null)}
      >
        {/* Background track */}
        <rect x={20} y={barY} width={barWidth} height={barHeight} rx={4} fill="#f1f5f9" />

        {/* Segments */}
        {bars.map((bar, i) => (
          <rect
            key={bar.label}
            x={bar.x}
            y={barY}
            width={Math.max(bar.w, 0.5)}
            height={barHeight}
            fill={bar.color}
            opacity={hover ? (hover.label === bar.label ? 1 : 0.6) : 0.85}
            rx={i === 0 ? 4 : 0}
            ry={i === 0 ? 4 : 0}
            className="cursor-pointer transition-opacity duration-150"
            onMouseMove={(e) => handleMouseMove(e, bar)}
            onMouseLeave={() => setHover(null)}
          />
        ))}

        {/* Round the right end */}
        {bars.length > 0 && (
          <rect
            x={bars[bars.length - 1].x + bars[bars.length - 1].w - 4}
            y={barY}
            width={4}
            height={barHeight}
            fill={bars[bars.length - 1].color}
            opacity={hover ? (hover.label === bars[bars.length - 1].label ? 1 : 0.6) : 0.85}
            rx={4}
            ry={4}
            className="pointer-events-none"
          />
        )}

        {/* Principal due marker */}
        {markerX !== null && markerX <= 20 + barWidth && (
          <>
            <line
              x1={markerX}
              y1={barY - 4}
              x2={markerX}
              y2={barY + barHeight + 4}
              stroke="#dc2626"
              strokeWidth={2}
              strokeDasharray="4,2"
              className="pointer-events-none"
            />
            <text
              x={markerX}
              y={barY + barHeight + 16}
              textAnchor="middle"
              style={{ fontSize: 9, fill: '#dc2626', fontWeight: 600 }}
              className="pointer-events-none"
            >
              Principal due
            </text>
          </>
        )}

        {/* Total NAV label */}
        <text
          x={20 + barWidth}
          y={barY + barHeight + 16}
          textAnchor="end"
          style={{ fontSize: 10, fill: '#69707a' }}
          className="pointer-events-none"
        >
          NAV: GHS {totalNAV.toLocaleString('en-GH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </text>

        {/* Legend row */}
        {bars.map((bar, i) => {
          const legendX = 20 + i * (barWidth / bars.length);
          const legendY = barY + barHeight + 36;
          return (
            <g key={bar.label} className="pointer-events-none">
              <rect x={legendX} y={legendY} width={8} height={8} rx={2} fill={bar.color} opacity={0.85} />
              <text x={legendX + 12} y={legendY + 7} style={{ fontSize: 9, fill: '#69707a' }}>
                {bar.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {hover && (
        <div
          className="pointer-events-none absolute z-20 rounded-md border border-brand-line bg-white px-3 py-2 shadow-lg"
          style={{ left: Math.min(hover.x + 12, 300), top: Math.max(hover.y - 50, 0) }}
        >
          <p className="text-xs font-semibold text-brand-black">{hover.label}</p>
          <p className="text-xs text-brand-muted">
            GHS {hover.value.toLocaleString('en-GH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
          <p className="text-[10px] font-semibold text-brand-navy">{(hover.pct * 100).toFixed(1)}% of NAV</p>
        </div>
      )}
    </div>
  );
}
