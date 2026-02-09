import React, { useState, useMemo } from 'react';
import { ArrowLeft, Loader2, Download, ArrowUpDown, ChevronUp, ChevronDown, Table } from 'lucide-react';
import { useView } from '../contexts/ViewContext';

// =============================================================================
// TYPES
// =============================================================================

export interface DataTableColumn {
  key: string;
  label: string;
  type?: 'string' | 'number' | 'date';
}

export interface DataTableData {
  title: string;
  description?: string;
  sourceCount: number;
  columns: DataTableColumn[];
  rows: Record<string, any>[];
}

interface DataTableViewerProps {
  data: DataTableData;
  isGenerating?: boolean;
  onFeedback?: (type: 'good' | 'bad') => void;
}

// =============================================================================
// DATA TABLE VIEWER COMPONENT
// =============================================================================

const DataTableViewer: React.FC<DataTableViewerProps> = ({ 
  data, 
  isGenerating = false,
  onFeedback 
}) => {
  const { setView } = useView();
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [searchTerm, setSearchTerm] = useState('');

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const filteredAndSortedRows = useMemo(() => {
    let result = [...(data.rows || [])];

    // Filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      result = result.filter(row => 
        Object.values(row).some(val => 
          String(val).toLowerCase().includes(search)
        )
      );
    }

    // Sort
    if (sortKey) {
      result.sort((a, b) => {
        const aVal = a[sortKey];
        const bVal = b[sortKey];
        const column = data.columns.find(c => c.key === sortKey);
        
        if (column?.type === 'number') {
          const aNum = parseFloat(aVal) || 0;
          const bNum = parseFloat(bVal) || 0;
          return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
        }
        
        const aStr = String(aVal || '');
        const bStr = String(bVal || '');
        return sortDirection === 'asc' 
          ? aStr.localeCompare(bStr)
          : bStr.localeCompare(aStr);
      });
    }

    return result;
  }, [data.rows, data.columns, searchTerm, sortKey, sortDirection]);

  if (isGenerating) {
    return (
      <div className="h-full flex flex-col bg-slate-900">
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span className="text-purple-400">Studio</span>
            <span>›</span>
            <span>Data Table</span>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="flex items-center gap-3 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
            <div>
              <p className="font-medium">Extracting data...</p>
              <p className="text-sm text-slate-500">based on {data.sourceCount} sources</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data.columns || data.columns.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-900 text-slate-400">
        <p>No table data available</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-900 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div>
          <button 
            onClick={() => setView('idle')}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-1"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Table className="w-5 h-5 text-orange-400" />
            {data.title}
          </h2>
          {data.description && <p className="text-sm text-slate-500">{data.description}</p>}
        </div>
        <button 
          className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-slate-300 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Search & Stats */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-4">
        <input
          type="text"
          placeholder="Search table..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 max-w-md px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
        />
        <div className="text-sm text-slate-400">
          {filteredAndSortedRows.length} of {data.rows?.length || 0} rows
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 bg-slate-950 z-10">
            <tr>
              {data.columns.map((column) => (
                <th 
                  key={column.key}
                  onClick={() => handleSort(column.key)}
                  className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800 cursor-pointer hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {column.label}
                    {sortKey === column.key ? (
                      sortDirection === 'asc' ? (
                        <ChevronUp className="w-4 h-4 text-purple-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-purple-400" />
                      )
                    ) : (
                      <ArrowUpDown className="w-4 h-4 text-slate-600" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedRows.map((row, rowIndex) => (
              <tr 
                key={rowIndex}
                className="hover:bg-slate-800/50 transition-colors"
              >
                {data.columns.map((column) => (
                  <td 
                    key={column.key}
                    className="px-4 py-3 text-sm text-slate-300 border-b border-slate-800"
                  >
                    {row[column.key] ?? '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {filteredAndSortedRows.length === 0 && (
          <div className="p-8 text-center text-slate-500">
            {searchTerm ? 'No matching rows found' : 'No data available'}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950">
        <p className="text-xs text-slate-500 text-center">
          Generated from {data.sourceCount} source{data.sourceCount !== 1 ? 's' : ''} • {data.columns.length} columns • {data.rows?.length || 0} rows
        </p>
      </div>
    </div>
  );
};

export default DataTableViewer;
