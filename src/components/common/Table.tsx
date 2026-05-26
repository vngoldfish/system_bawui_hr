import { ReactNode } from 'react';

interface TableProps {
  headers: string[];
  children: ReactNode;
  className?: string;
  colGroup?: ReactNode;
}

export default function Table({ headers, children, className, colGroup }: TableProps) {
  return (
    <div className="overflow-x-auto">
      <table className={`w-full ${className || ''}`}>
        {colGroup}
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            {headers.map((header, index) => (
              <th
                key={index}
                className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-200">
          {children}
        </tbody>
      </table>
    </div>
  );
}
