'use client';

import { ReactNode, useRef } from 'react';
import Table from './Table';
import ExportButtons from './ExportButtons';

interface ExportableTableProps {
  headers: string[];
  children: ReactNode;
  data: Record<string, unknown>[];
  columns: { header: string; key: string }[];
  fileName: string;
  title?: string;
  action?: ReactNode;
}

export default function ExportableTable({
  headers,
  children,
  data,
  columns,
  fileName,
}: ExportableTableProps) {
  const tableRef = useRef<HTMLTableElement>(null);

  return (
    <div>
      <div className="flex justify-end mb-3">
        <ExportButtons
          data={data}
          columns={columns}
          fileName={fileName}
          tableRef={tableRef}
        />
      </div>
      <div ref={tableRef}>
        <Table headers={headers}>{children}</Table>
      </div>
    </div>
  );
}
