import { ReactNode } from 'react';

interface TableProps {
  headers: string[];
  children: ReactNode;
  className?: string;
  colGroup?: ReactNode;
}

export default function Table({ headers, children, className, colGroup }: TableProps) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200/65 shadow-sm">
      <table className={`w-full border-collapse ${className || ''}`}>
        {colGroup}
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200/60 text-slate-500 text-xs font-bold uppercase tracking-wider">
            {headers.map((header, index) => (
              <th
                key={index}
                className="px-5 py-3.5 text-left font-extrabold tracking-wide"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-100">
          {children}
        </tbody>
      </table>
    </div>
  );
}
