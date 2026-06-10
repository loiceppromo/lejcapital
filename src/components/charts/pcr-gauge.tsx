/**
 * PCR semi-circle gauge — pure SVG, no dependencies.
 * Shows the PCR value on a coloured arc with BREACH / WATCH / GREEN zones.
 *
 * Zones (from the finance engine):
 *   < 1.00  → BREACH (red)
 *   1.00–1.25 → WATCH (amber)
 *   >= 1.25  → GREEN (emerald)
 *
 * The gauge maps 0.00x → 2.00x onto a 180-degree arc.
 */

interface Props {
  pcr: number;          // e.g. 1.18
  status: string;       // 'GREEN' | 'WATCH' | 'BREACH'
  liquidAssets: string; // formatted GHS string for subtitle
  size?: number;
}

export function PCRGauge({ pcr, status, liquidAssets, size = 240 }: Props) {
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

  // Arc path helper (counter-clockwise from startAngle to endAngle in our coord system)
  const arcPath = (startAngle: number, endAngle: number, radius: number) => {
    const start = arcPoint(startAngle, radius);
    const end = arcPoint(endAngle, radius);
    const largeArc = Math.abs(startAngle - endAngle) > Math.PI ? 1 : 0;
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 0 ${end.x} ${end.y}`;
  };

  // Zone boundaries in angle space (π = 0x, 0 = 2x)
  // PCR 1.00 → angle = π - (1.0/2.0)*π = π/2
  // PCR 1.25 → angle = π - (1.25/2.0)*π = 0.375π
  const breachEnd = Math.PI / 2;     // PCR < 1.00
  const watchEnd = 0.375 * Math.PI;  // PCR < 1.25

  const trackWidth = 14;
  const needle = arcPoint(needleAngle, r);

  // Status colour for needle
  const needleColor = status === 'GREEN' ? '#059669' : status === 'WATCH' ? '#d97706' : '#dc2626';

  return (
    <div className="flex flex-col items-center">
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
          stroke="#fecaca"
          strokeWidth={trackWidth}
          strokeLinecap="round"
        />
        {/* WATCH zone (amber) — π/2 to 0.375π */}
        <path
          d={arcPath(breachEnd, watchEnd, r)}
          fill="none"
          stroke="#fde68a"
          strokeWidth={trackWidth}
          strokeLinecap="butt"
        />
        {/* GREEN zone — 0.375π to 0 */}
        <path
          d={arcPath(watchEnd, 0, r)}
          fill="none"
          stroke="#bbf7d0"
          strokeWidth={trackWidth}
          strokeLinecap="round"
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
      <p className="mt-1 text-xs text-brand-muted">Liquid assets: {liquidAssets}</p>
    </div>
  );
}
