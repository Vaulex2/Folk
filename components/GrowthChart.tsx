// Hand-rolled SVG line chart for a sheep's weight history. Server component —
// pure markup, no interactivity, styled with the Organic design tokens.

export interface GrowthPoint {
  date: string; // ISO, pre-sorted ascending
  kg: number;
  label: string; // localized date, used for the native hover tooltip
}

const W = 600;
const H = 220;
const PAD = { top: 18, right: 16, bottom: 26, left: 44 };

export default function GrowthChart({
  points,
  firstLabel,
  lastLabel,
  kgUnit,
}: {
  points: GrowthPoint[];
  firstLabel: string; // localized date of the first record
  lastLabel: string; // localized date of the last record
  kgUnit: string;
}) {
  if (points.length < 2) return null;

  const ts = points.map((p) => new Date(p.date + "T00:00:00").getTime());
  const t0 = Math.min(...ts);
  const t1 = Math.max(...ts);
  const kgs = points.map((p) => p.kg);
  let kMin = Math.min(...kgs);
  let kMax = Math.max(...kgs);
  const padKg = Math.max(1, (kMax - kMin) * 0.15);
  kMin -= padKg;
  kMax += padKg;

  const x = (t: number) =>
    t1 === t0
      ? (PAD.left + W - PAD.right) / 2
      : PAD.left + ((t - t0) / (t1 - t0)) * (W - PAD.left - PAD.right);
  const y = (kg: number) => PAD.top + ((kMax - kg) / (kMax - kMin)) * (H - PAD.top - PAD.bottom);

  const coords = points.map((p, i) => ({ cx: x(ts[i]), cy: y(p.kg), kg: p.kg, label: p.label }));
  const line = coords.map((c) => `${c.cx.toFixed(1)},${c.cy.toFixed(1)}`).join(" ");
  const baseline = H - PAD.bottom;
  const area = `${coords[0].cx.toFixed(1)},${baseline} ${line} ${coords[coords.length - 1].cx.toFixed(1)},${baseline}`;

  const kgTop = Math.round(kMax - padKg);
  const kgBottom = Math.round(kMin + padKg);

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${kgBottom}–${kgTop} ${kgUnit}`}>
      <polygon points={area} fill="var(--color-accent-100)" opacity="0.6" />
      <line
        x1={PAD.left}
        y1={baseline}
        x2={W - PAD.right}
        y2={baseline}
        stroke="var(--color-divider)"
        strokeWidth="1"
      />
      <polyline
        points={line}
        fill="none"
        stroke="var(--color-accent-700)"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {coords.map((c, i) => (
        <circle key={i} cx={c.cx} cy={c.cy} r="4" fill="var(--color-accent-700)" stroke="var(--color-surface)" strokeWidth="1.5">
          <title>{`${c.label} · ${c.kg} ${kgUnit}`}</title>
        </circle>
      ))}
      <text x={PAD.left - 8} y={y(kgTop) + 4} textAnchor="end" fontSize="11" fill="var(--muted)">
        {kgTop} {kgUnit}
      </text>
      <text x={PAD.left - 8} y={y(kgBottom) + 4} textAnchor="end" fontSize="11" fill="var(--muted)">
        {kgBottom} {kgUnit}
      </text>
      <text x={PAD.left} y={H - 8} fontSize="11" fill="var(--muted)">
        {firstLabel}
      </text>
      <text x={W - PAD.right} y={H - 8} textAnchor="end" fontSize="11" fill="var(--muted)">
        {lastLabel}
      </text>
    </svg>
  );
}
