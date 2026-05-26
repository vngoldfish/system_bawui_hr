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
    <div onClick={onClick} className={cn("bg-white rounded-lg shadow-sm border border-slate-200", onClick && "cursor-pointer", className)}>
      {(title || action) && (
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          {title && <h3 className="font-semibold text-slate-800">{title}</h3>}
          {action}
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
    </div>
  );
}
