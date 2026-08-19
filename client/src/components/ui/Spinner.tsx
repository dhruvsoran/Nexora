const EMOJIS = ['🚀', '✨', '🎯', '⚡', '🎨', '🌿'];

export function Spinner({ label = 'Loading...' }: { label?: string }) {
  const emoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16">
      <span className="relative flex h-14 w-14 items-center justify-center">
        <span className="absolute inset-0 rounded-full bg-teal-50 dark:bg-teal-950/50" />
        <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-teal-600 border-r-orange-400" />
        <span className="animate-bounce text-2xl">{emoji}</span>
      </span>
      <span className="animate-pulse text-sm font-medium text-slate-500 dark:text-slate-400">{label}</span>
    </div>
  );
}