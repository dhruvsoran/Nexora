import { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-slate-200/70 dark:bg-slate-800', className)} />;
}

export function SkeletonCard({ className = '', children }: { className?: string; children?: ReactNode }) {
  return (
    <div className={cn('rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900', className)}>
      {children ?? (
        <>
          <Skeleton className="mb-3 h-9 w-9 rounded-lg" />
          <Skeleton className="mb-2 h-4 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
        </>
      )}
    </div>
  );
}