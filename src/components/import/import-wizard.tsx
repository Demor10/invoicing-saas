"use client";

import { useState } from "react";
import Link from "next/link";
import { RevenueChart } from "@/components/analytics/revenue-chart";
import { CategoryChart } from "@/components/analytics/category-chart";
import { formatTotals } from "@/lib/money";

type FieldMapping = {
  date: number | null;
  description: number | null;
  amount: number | null;
  category: number | null;
};

type ParsedFile = {
  headers: string[];
  rows: string[][];
  truncated: boolean;
  suggestedMapping: FieldMapping;
};

type ReportShape = {
  range: { start: string; end: string };
  currency: string;
  revenueTotals: { currency: string; amount: number }[];
  expenseTotals: { currency: string; amount: number }[];
  profitTotals: { currency: string; amount: number }[];
  timeSeries: { key: string; label: string; revenue: number; expenses: number; profit: number }[];
  salesByCategory: { category: string; amount: number }[];
  expensesByCategory: { category: string; amount: number }[];
};

type SkippedRow = { rowNumber: number; reason: string };
type AnalyzeResult = { report: ReportShape; skipped: SkippedRow[] };
type CombinedResult = { report: ReportShape; skipped: (SkippedRow & { fileIndex: number })[]; fileCount: number };
type ImportResult = { imported: number; skipped: SkippedRow[] };

// Carried alongside a result so the export buttons can ask the server to
// rebuild the exact same report rather than trusting a client-held copy of
// the aggregated numbers.
type FileParams = {
  rows: string[][];
  mapping: FieldMapping;
  currency: string;
  type: "sale" | "expense";
};

type Stage =
  | { name: "upload" }
  | { name: "map"; file: ParsedFile }
  | { name: "analyzed"; result: AnalyzeResult; fileParams: FileParams }
  | { name: "imported"; result: ImportResult }
  | { name: "combined"; result: CombinedResult; files: FileParams[] };

type MappingOutcome =
  | { kind: "imported"; result: ImportResult }
  | { kind: "analyzed"; result: AnalyzeResult; fileParams: FileParams }
  | { kind: "addToCombined"; fileParams: FileParams };

const FIELD_LABELS: { key: keyof FieldMapping; label: string; required: boolean }[] = [
  { key: "date", label: "Date", required: true },
  { key: "description", label: "Description", required: true },
  { key: "amount", label: "Amount", required: true },
  { key: "category", label: "Category", required: false },
];

export function ImportWizard() {
  const [stage, setStage] = useState<Stage>({ name: "upload" });
  const [accumulatedFiles, setAccumulatedFiles] = useState<FileParams[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCombining, setIsCombining] = useState(false);

  const onUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const fileInput = form.elements.namedItem("file") as HTMLInputElement;
    const file = fileInput.files?.[0];
    if (!file) {
      setError("Choose a file first.");
      return;
    }

    setIsSubmitting(true);
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/import/parse", { method: "POST", body: formData });
    const data = await res.json().catch(() => ({}));
    setIsSubmitting(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to parse file.");
      return;
    }

    setStage({ name: "map", file: data });
  };

  const runCombinedAnalysis = async (files: FileParams[]) => {
    setIsCombining(true);
    setError(null);
    const res = await fetch("/api/import/analyze-combined", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ files }),
    });
    const data = await res.json().catch(() => ({}));
    setIsCombining(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to combine files.");
      return;
    }
    setStage({ name: "combined", result: data, files });
  };

  const onMappingDone = (outcome: MappingOutcome) => {
    if (outcome.kind === "imported") {
      setStage({ name: "imported", result: outcome.result });
    } else if (outcome.kind === "analyzed") {
      setStage({ name: "analyzed", result: outcome.result, fileParams: outcome.fileParams });
    } else {
      const updated = [...accumulatedFiles, outcome.fileParams];
      setAccumulatedFiles(updated);
      runCombinedAnalysis(updated);
    }
  };

  if (stage.name === "upload") {
    return (
      <div className="space-y-4">
        {accumulatedFiles.length > 0 && (
          <p className="rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-600">
            {accumulatedFiles.length} file{accumulatedFiles.length === 1 ? "" : "s"} already in your
            running combined analysis. Upload another to add to it, or{" "}
            <button
              onClick={() => setAccumulatedFiles([])}
              className="font-medium underline"
            >
              start over
            </button>
            .
          </p>
        )}
        <form onSubmit={onUpload} className="space-y-4">
          <input
            type="file"
            name="file"
            accept=".csv,.xls,.xlsx"
            className="block w-full text-sm text-gray-700"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {isSubmitting ? "Reading file..." : "Upload"}
          </button>
        </form>
      </div>
    );
  }

  if (stage.name === "map") {
    return (
      <MappingStep
        file={stage.file}
        isCombining={isCombining}
        combinedError={error}
        onBack={() => setStage({ name: "upload" })}
        onDone={onMappingDone}
      />
    );
  }

  if (stage.name === "imported") {
    return (
      <div className="space-y-4">
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Imported {stage.result.imported} record{stage.result.imported === 1 ? "" : "s"}.
        </div>
        {stage.result.skipped.length > 0 && <SkippedRowsNote skipped={stage.result.skipped} />}
        <div className="flex gap-3">
          <Link href="/sales" className="text-sm font-medium text-gray-700 underline">
            View sales
          </Link>
          <Link href="/expenses" className="text-sm font-medium text-gray-700 underline">
            View expenses
          </Link>
          <button
            onClick={() => setStage({ name: "upload" })}
            className="text-sm font-medium text-gray-700 underline"
          >
            Import another file
          </button>
        </div>
      </div>
    );
  }

  if (stage.name === "combined") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">
            Running combined analysis of {stage.result.fileCount} file
            {stage.result.fileCount === 1 ? "" : "s"} — not saved, and not blended with your
            existing records. {stage.result.report.range.start} to {stage.result.report.range.end}.
          </p>
          <ExportButtons mode="combined" files={stage.files} />
        </div>
        <ReportView report={stage.result.report} />
        {stage.result.skipped.length > 0 && (
          <SkippedRowsNote
            skipped={stage.result.skipped.map((s) => ({
              rowNumber: s.rowNumber,
              reason: `File ${s.fileIndex + 1}, row ${s.rowNumber}: ${s.reason}`,
            }))}
          />
        )}
        <div className="flex gap-3">
          <button
            onClick={() => setStage({ name: "upload" })}
            className="text-sm font-medium text-gray-700 underline"
          >
            Add another file
          </button>
          <button
            onClick={() => {
              setAccumulatedFiles([]);
              setStage({ name: "upload" });
            }}
            className="text-sm font-medium text-gray-700 underline"
          >
            Start a new combined analysis
          </button>
        </div>
      </div>
    );
  }

  // stage.name === "analyzed"
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">
          One-off analysis of this file only — not saved, and not blended with your existing
          records. {stage.result.report.range.start} to {stage.result.report.range.end}.
        </p>
        <ExportButtons mode="single" file={stage.fileParams} />
      </div>
      <ReportView report={stage.result.report} />
      {stage.result.skipped.length > 0 && <SkippedRowsNote skipped={stage.result.skipped} />}
      <button
        onClick={() => setStage({ name: "upload" })}
        className="text-sm font-medium text-gray-700 underline"
      >
        Analyze another file
      </button>
    </div>
  );
}

function ReportView({ report }: { report: ReportShape }) {
  return (
    <>
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-md border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500">Revenue</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">
            {formatTotals(report.revenueTotals)}
          </p>
        </div>
        <div className="rounded-md border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500">Expenses</p>
          <p className="mt-1 text-lg font-semibold text-red-600">
            {formatTotals(report.expenseTotals)}
          </p>
        </div>
        <div className="rounded-md border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500">Net</p>
          <p className="mt-1 text-lg font-semibold text-green-700">
            {formatTotals(report.profitTotals)}
          </p>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-900">Trend</h3>
        <div className="mt-2">
          <RevenueChart data={report.timeSeries} />
        </div>
      </div>

      {report.salesByCategory.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Revenue by category</h3>
          <div className="mt-2">
            <CategoryChart data={report.salesByCategory} color="#111827" />
          </div>
        </div>
      )}
      {report.expensesByCategory.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Expenses by category</h3>
          <div className="mt-2">
            <CategoryChart data={report.expensesByCategory} color="#dc2626" />
          </div>
        </div>
      )}
    </>
  );
}

const EXPORT_OPTIONS: { format: "pdf" | "word" | "excel"; label: string }[] = [
  { format: "pdf", label: "PDF" },
  { format: "word", label: "Word" },
  { format: "excel", label: "Excel" },
];

function ExportButtons(
  props: { mode: "single"; file: FileParams } | { mode: "combined"; files: FileParams[] }
) {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onExport = async (format: "pdf" | "word" | "excel") => {
    setDownloading(format);
    setError(null);

    const url = props.mode === "single" ? "/api/import/export" : "/api/import/export-combined";
    const body =
      props.mode === "single" ? { ...props.file, format } : { files: props.files, format };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Export failed.");
      setDownloading(null);
      return;
    }

    // Downloading a POST response's file requires building a blob URL and
    // triggering a click on a throwaway link — a plain <a href> can't POST.
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = `${props.mode === "single" ? "file" : "combined"}-analysis.${format === "word" ? "docx" : format === "excel" ? "xlsx" : "pdf"}`;
    link.click();
    URL.revokeObjectURL(blobUrl);
    setDownloading(null);
  };

  return (
    <div className="flex items-center gap-2">
      {EXPORT_OPTIONS.map((opt) => (
        <button
          key={opt.format}
          onClick={() => onExport(opt.format)}
          disabled={downloading !== null}
          className="rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {downloading === opt.format ? "..." : `Export ${opt.label}`}
        </button>
      ))}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}

function SkippedRowsNote({ skipped }: { skipped: SkippedRow[] }) {
  return (
    <details className="rounded-md border border-gray-200 p-3 text-xs text-gray-500">
      <summary className="cursor-pointer font-medium text-gray-700">
        {skipped.length} row{skipped.length === 1 ? "" : "s"} skipped
      </summary>
      <ul className="mt-2 space-y-1">
        {skipped.slice(0, 20).map((s, i) => (
          <li key={i}>
            Row {s.rowNumber}: {s.reason}
          </li>
        ))}
        {skipped.length > 20 && <li>...and {skipped.length - 20} more</li>}
      </ul>
    </details>
  );
}

function MappingStep({
  file,
  isCombining,
  combinedError,
  onBack,
  onDone,
}: {
  file: ParsedFile;
  isCombining: boolean;
  combinedError: string | null;
  onBack: () => void;
  onDone: (outcome: MappingOutcome) => void;
}) {
  const [mapping, setMapping] = useState<FieldMapping>(file.suggestedMapping);
  const [currency, setCurrency] = useState("USD");
  const [type, setType] = useState<"sale" | "expense">("sale");
  const [action, setAction] = useState<"import" | "analyze">("analyze");
  const [addToCombined, setAddToCombined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setField = (field: keyof FieldMapping, value: string) => {
    setMapping((m) => ({ ...m, [field]: value === "" ? null : Number(value) }));
  };

  const onSubmit = async () => {
    setError(null);
    if (mapping.date === null || mapping.description === null || mapping.amount === null) {
      setError("Date, description, and amount must all be mapped to a column.");
      return;
    }

    const fileParams: FileParams = { rows: file.rows, mapping, currency, type };

    if (action === "analyze" && addToCombined) {
      // The parent owns the running file list and calls the combined-analyze
      // endpoint itself, since it needs every accumulated file, not just
      // this one.
      onDone({ kind: "addToCombined", fileParams });
      return;
    }

    setIsSubmitting(true);
    const res = await fetch("/api/import/process", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...fileParams, action }),
    });
    const data = await res.json().catch(() => ({}));
    setIsSubmitting(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to process file.");
      return;
    }

    if (action === "import") {
      onDone({ kind: "imported", result: data });
    } else {
      onDone({ kind: "analyzed", result: data, fileParams });
    }
  };

  const busy = isSubmitting || isCombining;

  return (
    <div className="space-y-6">
      {file.truncated && (
        <p className="text-xs text-amber-600">
          This file has more than 2000 rows — only the first 2000 will be used.
        </p>
      )}

      <div>
        <h3 className="text-sm font-semibold text-gray-900">Preview</h3>
        <div className="mt-2 overflow-x-auto rounded-md border border-gray-200">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                {file.headers.map((h, i) => (
                  <th key={i} className="px-2 py-1.5 text-left font-medium text-gray-600">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {file.rows.slice(0, 5).map((row, i) => (
                <tr key={i} className="border-b border-gray-100">
                  {row.map((cell, j) => (
                    <td key={j} className="px-2 py-1.5 text-gray-700">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-900">Map columns</h3>
        <div className="mt-2 grid grid-cols-2 gap-4">
          {FIELD_LABELS.map(({ key, label, required }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700">
                {label} {required && <span className="text-red-500">*</span>}
              </label>
              <select
                value={mapping[key] ?? ""}
                onChange={(e) => setField(key, e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">— None —</option>
                {file.headers.map((h, i) => (
                  <option key={i} value={i}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">This file contains</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as "sale" | "expense")}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="sale">Sales</option>
            <option value="expense">Expenses</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Currency</label>
          <input
            type="text"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">What do you want to do?</label>
        <div className="mt-2 space-y-2">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="radio"
              checked={action === "analyze"}
              onChange={() => setAction("analyze")}
            />
            Analyze only — don&apos;t save anything
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="radio"
              checked={action === "import"}
              onChange={() => setAction("import")}
            />
            Import as real records
          </label>
        </div>
        {action === "analyze" && (
          <label className="mt-2 flex items-center gap-2 pl-6 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={addToCombined}
              onChange={(e) => setAddToCombined(e.target.checked)}
            />
            Add this to a running combined analysis instead of a one-off (upload more files
            afterward to keep building on it)
          </label>
        )}
      </div>

      {(error || combinedError) && <p className="text-sm text-red-600">{error ?? combinedError}</p>}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          type="button"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={onSubmit}
          disabled={busy}
          className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {busy
            ? "Processing..."
            : action === "import"
              ? "Import"
              : addToCombined
                ? "Add to combined analysis"
                : "Analyze"}
        </button>
      </div>
    </div>
  );
}
