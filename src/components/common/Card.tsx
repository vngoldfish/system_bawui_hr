import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  action?: ReactNode;
  onClick?: () => void;
}

export default function Card({ children, className, title, action, onClick }: CardProps) {
  return (
    <div onClick={onClick} className={cn("bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800", onClick && "cursor-pointer", className)}>
      {(title || action) && (
        <div className="px-4 py-3.5 sm:px-6 sm:py-4 border-b border-slate-200 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {title && <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm sm:text-base">{title}</h3>}
          {action}
        </div>
      )}
      <div className="p-4 sm:p-6">
        {children}
      </div>
    </div>
  );
}
