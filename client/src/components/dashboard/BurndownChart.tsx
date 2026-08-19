import { BurndownPoint } from '../../api/types';

export function BurndownChart({ points }: { points: BurndownPoint[] }) {
  if (points.length === 0) return null;

  const width = 560;
  const height = 200;
  const pad = 30;

  const maxY = Math.max(...points.map((p) => Math.max(p.created, p.completed)), 1);
  const x = (i: number) => pad + (i * (width - pad * 2)) / Math.max(points.length - 1, 1);
  const y = (v: number) => height - pad - (v / maxY) * (height - pad * 2);

  const createdPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(p.created)}`).join(' ');
  const completedPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(p.completed)}`).join(' ');

  const last = points[points.length - 1];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
      {Array.from({ length: 5 }, (_, i) => {
        const v = (maxY / 4) * (4 - i);
        return (
          <g key={v}>
            <line x1={pad} x2={width - pad} y1={y(v)} y2={y(v)} stroke="#e2e8f0" strokeDasharray="4 4" />
            <text x={4} y={y(v) + 3} fontSize="10" fill="#94a3b8">
              {Math.round(v)}
            </text>
          </g>
        );
      })}

      <path d={createdPath} fill="none" stroke="#f97316" strokeWidth="2.5" />
      <path d={completedPath} fill="none" stroke="#0d9488" strokeWidth="2.5" />

      <line x1={x(points.length - 1)} x2={x(points.length - 1)} y1={y(last.created)} y2={y(last.completed)} stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />

      {points.length <= 14 &&
        points.map((p, i) => (
          <g key={p.date}>
            <circle cx={x(i)} cy={y(p.created)} r="2.5" fill="#f97316" />
            <circle cx={x(i)} cy={y(p.completed)} r="2.5" fill="#0d9488" />
          </g>
        ))}

      <text x={pad} y={height - 6} fontSize="10" fill="#f97316">
        created
      </text>
      <text x={pad + 46} y={height - 6} fontSize="10" fill="#0d9488">
        completed
      </text>
    </svg>
  );
}