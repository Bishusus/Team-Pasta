/**
 * Utility function to export array of objects to a downloadable CSV file.
 */
export function exportToCsv(filename, rows, headers) {
  if (!rows || !rows.length) return;

  const keys = headers ? headers.map((h) => h.key) : Object.keys(rows[0]);
  const headerLabels = headers ? headers.map((h) => h.label) : keys;

  const escapeCell = (val) => {
    if (val == null) return '""';
    const str = Array.isArray(val) ? val.join("; ") : String(val);
    return `"${str.replace(/"/g, '""')}"`;
  };

  const csvLines = [
    headerLabels.map((l) => `"${l}"`).join(","),
    ...rows.map((row) => keys.map((key) => escapeCell(row[key])).join(",")),
  ];

  const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(csvLines.join("\n"));
  const link = document.createElement("a");
  link.setAttribute("href", csvContent);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
