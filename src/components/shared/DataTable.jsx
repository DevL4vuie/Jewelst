import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Button from '../ui/Button';
import ExcelExportBtn from './ExcelExportBtn';

export default function DataTable({
  columns,
  data = [],
  searchKey = '',
  searchPlaceholder = 'Search records...',
  exportFileName = 'export_data',
  exportSheetName = 'Sheet1',
  actions,
  pageSize = 10
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Filter rows based on search
  const filteredData = data.filter(row => {
    if (!searchTerm) return true;
    if (searchKey && row[searchKey]) {
      return String(row[searchKey]).toLowerCase().includes(searchTerm.toLowerCase());
    }
    // Search across all text fields if no specific key
    return Object.values(row).some(val =>
      val !== null && val !== undefined && String(val).toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // Pagination
  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = filteredData.slice(startIndex, startIndex + pageSize);

  return (
    <div className="w-full">
      {/* Header controls: Search and Export */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-3">
        <div className="flex-1" style={{ maxWidth: '380px' }}>
          <input
            type="text"
            className="pos-input"
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        <div className="flex items-center gap-2 justify-end data-table__actions">
          {actions}
          <ExcelExportBtn
            data={filteredData}
            fileName={exportFileName}
            sheetName={exportSheetName}
            size="sm"
          />
        </div>
      </div>

      {/* Table Card Wrapper */}
      <div className="pos-table-wrapper">
        <table className="pos-table">
          <thead>
            <tr>
              {columns.map((col, idx) => (
                <th key={idx} style={{ textAlign: col.align || 'left', width: col.width || 'auto' }}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
                  <div className="text-muted font-bold">No matching records found.</div>
                </td>
              </tr>
            ) : (
              paginatedData.map((row, rowIdx) => (
                <tr key={row.id || rowIdx}>
                  {columns.map((col, colIdx) => (
                    <td key={colIdx} style={{ textAlign: col.align || 'left' }}>
                      {col.render ? col.render(row) : row[col.accessor]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3 text-sm font-bold data-table__pagination">
          <span className="text-muted">
            Showing {Math.min(filteredData.length, startIndex + 1)} to {Math.min(filteredData.length, startIndex + pageSize)} of {filteredData.length} records
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            >
              <ChevronLeft size={16} />
            </Button>
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <Button
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
