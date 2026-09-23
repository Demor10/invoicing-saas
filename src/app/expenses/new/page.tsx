import { MultiMoneyEntryForm } from "@/components/multi-money-entry-form";

export default function NewExpensePage() {
  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-2xl font-semibold text-gray-900">Record expense</h1>
      <div className="mt-6">
        <MultiMoneyEntryForm kind="expense" bulkApiUrl="/api/expenses/bulk" redirectTo="/expenses" />
      </div>
    </div>
  );
}
