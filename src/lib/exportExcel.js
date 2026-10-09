import * as XLSX from 'xlsx';

export function exportToExcel(data, fileName, sheetName = 'Report') {
  if (!data || !data.length) {
    alert('No data to export.');
    return;
  }
  
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  
  // Format filename
  const cleanFileName = `${fileName}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(workbook, cleanFileName);
}
