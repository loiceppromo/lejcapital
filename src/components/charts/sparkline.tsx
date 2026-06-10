/**
 * Sparkline — tiny inline SVG trend chart for KPI cards.
 *
 * Pure SVG, no chart library. Renders a mini area chart that shows
 * directional trend. Supports optional color based on trend direction.
 */
interface SparklineProps {
  /** Data points (at least 2). Y values only — X is evenly distributed. */
  data: number[];
  /** Width in px (default 80) */
  width?: number;
  /** Height in px (default 24) */
  height?: number;
  /** Stroke color override. Defaults to auto: green if trending up, red if down, navy if flat. */
  color?: string;
  /** Show the filled area under the line (default true) */
  showArea?: boolean;
  /** CSS class for the container */
  className?: string;
}

export function Sparkline({
  data,
  width = 80,
  height = 24,
  color,
  showArea = true,
  className = '',
}: SparklineProps) {
  if (data.length < 2) return null;

  const padding = 2;
  const chartW = width - padding * 2;
  const chartH = height - padding * 2;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1; // avoid divide-by-zero for flat lines

  // Normalize points to chart coordinates
  const points = data.map((val, i) => ({
    x: padding + (i / (data.length - 1)) * chartW,
    y: padding + chartH - ((val - min) / range) * chartH,
  }));

  // Build SVG path
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

  // Area path (close to bottom)
  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${height - padding} L ${points[0].x.toFixed(1)} ${height - padding} Z`;

  // Auto-color based on trend
  const trend = data[data.length - 1] - data[0];
  const autoColor = trend > 0 ? '#16a34a' : trend < 0 ? '#dc2626' : '#052b57';
  const strokeColor = color ?? autoColor;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden="true"
    >
      {showArea && (
        <path
          d={areaPath}
          fill={strokeColor}
          fillOpacity={0.1}
        />
      )}
      <path
        d={linePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Dot on the last point */}
      <circle
        cx={points[points.length - 1].x}
        cy={points[points.length - 1].y}
        r={2}
        fill={strokeColor}
      />
    </svg>
  );
}
