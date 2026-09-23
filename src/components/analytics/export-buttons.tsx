export function ExportButtons({ queryString }: { queryString: string }) {
  const linkClass =
    "rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50";

  return (
    <div className="flex gap-2">
      <a href={`/api/analytics/export/pdf?${queryString}`} className={linkClass}>
        Export PDF
      </a>
      <a href={`/api/analytics/export/word?${queryString}`} className={linkClass}>
        Export Word
      </a>
      <a href={`/api/analytics/export/excel?${queryString}`} className={linkClass}>
        Export Excel
      </a>
    </div>
  );
}
