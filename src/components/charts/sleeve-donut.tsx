'use client';

/**
 * Sleeve allocation donut chart — pure SVG with interactive hover tooltips.
 * Renders a donut ring with one arc per sleeve, plus a center label.
 */

import { useState, useCallback } from 'react';

export interface SleeveSegment {
  label: string;
  value: number;
  color: string;
}

interface Props {
  segments: SleeveSegment[];
  centerLabel?: string;
  centerValue?: string;
  size?: number;
}

export function SleeveDonutChart({ segments, centerLabel, centerValue, size = 220 }: Props) {
  const [hover, setHover] = useState<{ label: string; value: number; fraction: number; x: number; y: number } | null>(null);
  const total = segments.reduce((sum, s) => sum + s.value, 0);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGPathElement>, arc: { label: string; value: number; fraction: number }) => {
    const svg = (e.target as SVGElement).closest('svg');
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    setHover({
      label: arc.label,
      value: arc.value,
      fraction: arc.fraction,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }, []);

  if (total === 0) {
    return (
      <div className="flex items-center justify-center" style={{ width: size, height: size }}>
        <p className="text-sm text-brand-muted">No sleeve data</p>
      </div>
    );
  }

  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 4;
  const innerR = outerR * 0.6;
  const gapAngle = 0.02;

  const arcs = segments
    .filter((s) => s.value > 0)
    .reduce<{
      items: Array<SleeveSegment & { path: string; fraction: number }>;
      startAngle: number;
    }>((acc, seg) => {
      const startAngle = acc.startAngle;
      const fraction = seg.value / total;
      const sweepAngle = fraction * Math.PI * 2 - gapAngle;
      const endAngle = startAngle + sweepAngle;
      const largeArc = sweepAngle > Math.PI ? 1 : 0;

      const x1Outer = cx + outerR * Math.cos(startAngle);
      const y1Outer = cy + outerR * Math.sin(startAngle);
      const x2Outer = cx + outerR * Math.cos(endAngle);
      const y2Outer = cy + outerR * Math.sin(endAngle);

      const x1Inner = cx + innerR * Math.cos(endAngle);
      const y1Inner = cy + innerR * Math.sin(endAngle);
      const x2Inner = cx + innerR * Math.cos(startAngle);
      const y2Inner = cy + innerR * Math.sin(startAngle);

      const path = [
        `M ${x1Outer} ${y1Outer}`,
        `A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2Outer} ${y2Outer}`,
        `L ${x1Inner} ${y1Inner}`,
        `A ${innerR} ${innerR} 0 ${largeArc} 0 ${x2Inner} ${y2Inner}`,
        'Z',
      ].join(' ');

      return {
        items: [...acc.items, { ...seg, path, fraction }],
        startAngle: endAngle + gapAngle,
      };
    }, { items: [], startAngle: -Math.PI / 2 }).items;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="shrink-0"
          aria-label="Sleeve allocation chart"
          onMouseLeave={() => setHover(null)}
        >
          {arcs.map((arc) => (
            <path
              key={arc.label}
              d={arc.path}
              fill={arc.color}
              opacity={hover ? (hover.label === arc.label ? 1 : 0.5) : 0.9}
              className="cursor-pointer transition-opacity duration-150"
              onMouseMove={(e) => handleMouseMove(e, arc)}
              onMouseLeave={() => setHover(null)}
            />
          ))}
          {/* Center text */}
          {centerValue && (
            <>
              <text
                x={cx}
                y={cy - 6}
                textAnchor="middle"
                className="pointer-events-none fill-brand-black text-lg font-semibold"
                style={{ fontSize: 18, fontWeight: 600 }}
              >
                {centerValue}
              </text>
              {centerLabel && (
                <text
                  x={cx}
                  y={cy + 14}
                  textAnchor="middle"
                  className="pointer-events-none fill-brand-muted"
                  style={{ fontSize: 11 }}
                >
                  {centerLabel}
                </text>
              )}
            </>
          )}
        </svg>

        {/* Tooltip */}
        {hover && (
          <div
            className="pointer-events-none absolute z-20 rounded-md border border-brand-line bg-white px-3 py-2 shadow-lg"
            style={{ left: Math.min(hover.x + 12, size - 140), top: Math.max(hover.y - 50, 0) }}
          >
            <p className="text-xs font-semibold text-brand-black">{hover.label.replaceAll('_', ' ')}</p>
            <p className="text-xs text-brand-muted">
              GHS {hover.value.toLocaleString('en-GH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
            <p className="text-[10px] font-semibold text-brand-navy">{(hover.fraction * 100).toFixed(1)}%</p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
        {arcs.map((arc) => (
          <div key={arc.label} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: arc.color }}
            />
            <span className="text-xs text-brand-muted">
              {arc.label.replaceAll('_', ' ')} ({(arc.fraction * 100).toFixed(0)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
