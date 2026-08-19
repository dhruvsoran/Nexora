const palette = [
  '#0f766e',
  '#0d9488',
  '#14b8a6',
  '#2dd4bf',
  '#ea580c',
  '#f97316',
  '#fb7185',
  '#f43f5e',
  '#64748b',
  '#94a3b8',
];

const nameCache: Record<string, string> = {};

export function colorForName(name: string): string {
  if (nameCache[name]) return nameCache[name];
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  const color = palette[Math.abs(hash) % palette.length];
  nameCache[name] = color;
  return color;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

export function Avatar({
  name,
  src,
  size = 32,
}: {
  name: string;
  src?: string;
  size?: number;
}) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        style={{ width: size, height: size }}
        className="rounded-full object-cover ring-2 ring-white dark:ring-slate-800"
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size, backgroundColor: colorForName(name), fontSize: size / 2.6 }}
      className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white ring-2 ring-white dark:ring-slate-800"
    >
      {initials(name)}
    </div>
  );
}
