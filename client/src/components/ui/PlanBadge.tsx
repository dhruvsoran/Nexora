import { cn } from '../../lib/utils';

const LABELS: Record<string, string> = { pro: 'PRO', business: 'BUSINESS' };

export function PlanBadge({ plan, className }: { plan?: string; className?: string }) {
  const label = plan ? LABELS[plan] : undefined;
  if (!label) return null;
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full bg-gradient-to-r from-teal-600 to-orange-500 px-2 py-0.5 text-[10px] font-extrabold tracking-wider text-white shadow-sm',
        className
      )}
    >
      {label}
    </span>
  );
}