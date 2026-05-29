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
    <div 
      onClick={onClick} 
      className={cn(
        "bg-white rounded-3xl shadow-premium border border-slate-200/50 transition-all duration-300 ease-in-out overflow-hidden", 
        onClick && "cursor-pointer hover:shadow-premium-hover hover:-translate-y-0.5", 
        className
      )}
    >
      {(title || action) && (
        <div className="px-5 py-4 sm:px-6 sm:py-4.5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {title && <h3 className="font-extrabold text-slate-900 text-sm sm:text-base tracking-wide flex items-center gap-2">{title}</h3>}
          {action}
        </div>
      )}
      <div className="p-5 sm:p-6">
        {children}
      </div>
    </div>
  );
}
