/**
 * NAV composition horizontal stacked bar — pure SVG, no dependencies.
 *
 * Shows how the fund's Net Asset Value breaks down across:
 *   Protection sleeve, Reserve, Market Alpha, Operating Alpha,
 *   Loan Book (net of provisions), Cash.
 *
 * A thin red marker shows the investor principal due threshold.
 */

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
  const barWidth = 480;
  const barHeight = 32;
  const svgWidth = barWidth + 40;  // extra for label overflow
  const svgHeight = 110;
  const barY = 12;

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

  // Principal due marker position
  const markerX = principalDue > 0 ? 20 + Math.min(principalDue / total, 1) * barWidth : null;

  return (
    <div className="w-full overflow-x-auto">
      <svg
        width="100%"
        height={svgHeight}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        preserveAspectRatio="xMinYMin meet"
        aria-label="NAV breakdown chart"
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
            opacity={0.85}
            rx={i === 0 ? 4 : 0}
            ry={i === 0 ? 4 : 0}
          >
            <title>{`${bar.label}: GHS ${bar.value.toLocaleString('en-GH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} (${(bar.pct * 100).toFixed(1)}%)`}</title>
          </rect>
        ))}

        {/* Round the right end */}
        {bars.length > 0 && (
          <rect
            x={bars[bars.length - 1].x + bars[bars.length - 1].w - 4}
            y={barY}
            width={4}
            height={barHeight}
            fill={bars[bars.length - 1].color}
            opacity={0.85}
            rx={4}
            ry={4}
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
            />
            <text
              x={markerX}
              y={barY + barHeight + 16}
              textAnchor="middle"
              style={{ fontSize: 9, fill: '#dc2626', fontWeight: 600 }}
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
        >
          NAV: GHS {totalNAV.toLocaleString('en-GH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </text>

        {/* Legend row */}
        {bars.map((bar, i) => {
          const legendX = 20 + i * (barWidth / bars.length);
          const legendY = barY + barHeight + 36;
          return (
            <g key={bar.label}>
              <rect x={legendX} y={legendY} width={8} height={8} rx={2} fill={bar.color} opacity={0.85} />
              <text x={legendX + 12} y={legendY + 7} style={{ fontSize: 9, fill: '#69707a' }}>
                {bar.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
