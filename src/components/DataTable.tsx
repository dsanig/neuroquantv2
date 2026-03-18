import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Search, ChevronUp, ChevronDown } from "lucide-react";

interface Column {
  key: string;
  label: string;
  format?: (val: unknown, row: Record<string, unknown>) => string | React.ReactNode;
  align?: 'left' | 'right';
  className?: string;
  sortable?: boolean;
}

interface DataTableProps {
  columns: Column[];
  data: Record<string, unknown>[];
  searchable?: boolean;
  searchKeys?: string[];
  stickyHeader?: boolean;
  maxHeight?: string;
  emptyMessage?: string;
}

export function DataTable({ columns, data, searchable, searchKeys, stickyHeader, maxHeight, emptyMessage }: DataTableProps) {
  const [filter, setFilter] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const filtered = useMemo(() => {
    let rows = data;
    if (filter && searchKeys?.length) {
      const lc = filter.toLowerCase();
      rows = rows.filter(row =>
        searchKeys.some(k => String(row[k] ?? '').toLowerCase().includes(lc))
      );
    }
    if (sortKey) {
      rows = [...rows].sort((a, b) => {
        const av = a[sortKey] ?? '';
        const bv = b[sortKey] ?? '';
        const cmp = typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : String(av).localeCompare(String(bv));
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return rows;
  }, [data, filter, searchKeys, sortKey, sortDir]);

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  return (
    <div>
      {searchable && (
        <div className="relative w-64 mb-3">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Filter..." value={filter} onChange={e => setFilter(e.target.value)} className="pl-8 h-8 text-sm bg-secondary border-border" />
        </div>
      )}
      <div className={`overflow-x-auto ${maxHeight ? `max-h-[${maxHeight}] overflow-y-auto` : ''}`}>
        <table className="data-table">
          <thead className={stickyHeader ? 'sticky top-0 z-10' : ''}>
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  className={`${col.align === 'right' ? 'text-right' : ''} ${col.sortable !== false ? 'cursor-pointer select-none' : ''}`}
                  onClick={() => col.sortable !== false && toggleSort(col.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {sortKey === col.key && (sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={columns.length} className="text-center py-8 text-muted-foreground text-sm">{emptyMessage || 'No data'}</td></tr>
            ) : (
              filtered.map((row, idx) => (
                <tr key={idx}>
                  {columns.map(col => (
                    <td key={col.key} className={`${col.align === 'right' ? 'text-right' : ''} ${col.className || ''}`}>
                      {col.format ? col.format(row[col.key], row) : String(row[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {filtered.length > 0 && (
        <div className="text-xs text-muted-foreground mt-2 px-1">
          {filtered.length} row{filtered.length !== 1 ? 's' : ''}{filter ? ` (filtered from ${data.length})` : ''}
        </div>
      )}
    </div>
  );
}
