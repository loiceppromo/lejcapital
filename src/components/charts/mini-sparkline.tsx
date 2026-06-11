'use client';

/**
 * Mini inline sparkline chart — pure SVG, no library.
 * Renders a tiny line chart suitable for table cells or KPI cards.
 */
export function MiniSparkline({
  data,
  width = 80,
  height = 24,
  color,
  className,
}: {
  /** Array of numeric values to plot. Minimum 2 points. */
  data: number[];
  width?: number;
  height?: number;
  /** Line color. Defaults to brand-navy. */
  color?: string;
  className?: string;
}) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = 2; // padding inside SVG

  const plotW = width - pad * 2;
  const plotH = height - pad * 2;

  const points = data.map((value, i) => {
    const x = pad + (i / (data.length - 1)) * plotW;
    const y = pad + plotH - ((value - min) / range) * plotH;
    return `${x},${y}`;
  });

  const lineColor = color ?? 'var(--brand-navy, #052b57)';
  const isPositive = data[data.length - 1] >= data[0];
  const autoColor = color ? lineColor : isPositive ? '#10b981' : '#ef4444';

  // Build gradient fill beneath line
  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];
  const gradientId = `spark-grad-${Math.random().toString(36).slice(2, 8)}`;
  const fillPoints = `${firstPoint} ${points.join(' ')} ${lastPoint.split(',')[0]},${height - pad} ${pad},${height - pad}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      role="img"
      aria-label="Price trend sparkline"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={autoColor} stopOpacity="0.2" />
          <stop offset="100%" stopColor={autoColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={fillPoints} fill={`url(#${gradientId})`} />
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={autoColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* End dot */}
      <circle
        cx={Number(lastPoint.split(',')[0])}
        cy={Number(lastPoint.split(',')[1])}
        r="2"
        fill={autoColor}
      />
    </svg>
  );
}

/**
 * Generate simulated intraday price history for a base price.
 * Returns an array of prices with realistic random walk.
 */
export function generatePriceHistory(basePrice: number, points = 20, volatility = 0.008): number[] {
  const history: number[] = [basePrice * (1 - volatility * points * 0.3)];
  for (let i = 1; i < points; i++) {
    const prev = history[i - 1];
    const change = prev * volatility * (Math.random() * 2 - 1);
    history.push(prev + change);
  }
  // Ensure the last point is close to the actual current price
  history.push(basePrice);
  return history;
}
