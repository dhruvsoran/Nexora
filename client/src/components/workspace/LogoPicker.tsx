import { cn } from '../../lib/utils';

const LOGO_EMOJIS = ['🚀', '📦', '🎯', '🎨', '🧠', '⚡', '🌿', '📊', '🧪', '🏗️', '🛡️', '📚'];

export function LogoPicker({ value, onChange }: { value: string; onChange: (logo: string) => void }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Logo</label>
      <div className="grid grid-cols-6 gap-1.5">
        {LOGO_EMOJIS.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => onChange(e)}
            title={e}
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-lg text-xl transition',
              value === e
                ? 'bg-orange-100 ring-2 ring-orange-400 dark:bg-orange-950'
                : 'bg-slate-100 hover:bg-orange-50 dark:bg-slate-800 dark:hover:bg-slate-700'
            )}
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}

export { LOGO_EMOJIS };