import React from 'react';
import { Download } from 'lucide-react';
import Button from '../ui/Button';
import { exportToExcel } from '../../lib/exportExcel';

export default function ExcelExportBtn({
  data,
  fileName = 'Jewels_Sandals_Report',
  sheetName = 'Data',
  label = 'Export to Excel',
  size = 'normal',
  variant = 'default'
}) {
  const handleExport = () => {
    exportToExcel(data, fileName, sheetName);
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleExport}
      title="Download Excel Spreadsheet (.xlsx)"
    >
      <Download size={16} />
      <span>{label}</span>
    </Button>
  );
}
